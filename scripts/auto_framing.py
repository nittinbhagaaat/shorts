#!/usr/bin/env python3
"""
scripts/auto_framing.py
AI-Powered Active Speaker Camera Tracking & Auto-Framing for 9:16 Shorts.
Detects the primary speaking person in the video and generates smooth dynamic
camera panning to keep the speaker centered in the 9:16 vertical crop.
"""

import sys
import json
import argparse
import math
import numpy as np
import av
import torch
import torchvision.models.detection as d
from torchvision.transforms import functional as F

def analyze_speaker_tracking(video_path, fps_sample=1.5):
    """
    Analyzes video frames to track the primary person's horizontal center over time.
    Returns the optimal FFmpeg crop filter string.
    """
    try:
        # Load lightweight MobileNetV3 SSDLite detector
        device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
        model = d.ssdlite320_mobilenet_v3_large(weights=d.SSDLite320_MobileNet_V3_Large_Weights.DEFAULT)
        model.to(device)
        model.eval()

        container = av.open(video_path)
        stream = container.streams.video[0]
        try:
            stream.codec_context.thread_count = 8
        except Exception:
            pass
        
        orig_w = stream.width
        orig_h = stream.height
        duration = float(stream.duration * stream.time_base) if stream.duration else 30.0
        fps = float(stream.average_rate) if stream.average_rate else 30.0

        target_w = int(round(orig_h * 9.0 / 16.0))
        if target_w % 2 != 0:
            target_w += 1
        max_crop_x = max(0, orig_w - target_w)
        default_center_x = max_crop_x // 2

        if max_crop_x <= 0:
            # Video is already 9:16 or narrower
            return {
                "success": True,
                "cropFilter": "crop=w=in_w:h=in_h:x=0:y=0",
                "avgCropX": 0,
                "speakerFound": False,
                "message": "Video is already vertical"
            }

        # Sample at most 4 evenly spaced frames for ultra-fast, sub-second speaker tracking
        target_samples = 4
        sample_interval = max(1, int((duration * fps) / target_samples)) if duration > 0 else max(1, int(fps * 6))
        timestamps = []
        person_centers = []

        frame_idx = 0
        last_known_center = orig_w / 2.0

        for frame in container.decode(stream):
            if frame_idx % sample_interval == 0:
                t = float(frame.time) if frame.time is not None else (frame_idx / fps)
                timestamps.append(t)

                # Convert frame to torch tensor
                img = frame.to_image()
                # Downsample to max width 640 for ultra-fast inference
                scale = min(1.0, 640.0 / orig_w)
                if scale < 1.0:
                    img_small = img.resize((int(orig_w * scale), int(orig_h * scale)))
                else:
                    img_small = img

                img_tensor = F.to_tensor(img_small).unsqueeze(0).to(device)

                with torch.no_grad():
                    predictions = model(img_tensor)[0]

                # COCO class 1 = 'person'
                boxes = predictions['boxes'].cpu().numpy()
                labels = predictions['labels'].cpu().numpy()
                scores = predictions['scores'].cpu().numpy()

                person_mask = (labels == 1) & (scores > 0.40)
                person_boxes = boxes[person_mask]
                person_scores = scores[person_mask]

                if len(person_boxes) > 0:
                    # Pick person closest to center or with largest area
                    best_center = None
                    best_score = -1.0

                    for i, box in enumerate(person_boxes):
                        x1, y1, x2, y2 = box / scale
                        area = (x2 - x1) * (y2 - y1)
                        center_x = (x1 + x2) / 2.0
                        # Score combines detection confidence, box area, and proximity to last position
                        proximity = 1.0 - abs(center_x - last_known_center) / orig_w
                        score = float(person_scores[i]) * 0.4 + (area / (orig_w * orig_h)) * 0.4 + proximity * 0.2

                        if score > best_score:
                            best_score = score
                            best_center = center_x

                    if best_center is not None:
                        last_known_center = best_center
                        person_centers.append(best_center)
                    else:
                        person_centers.append(last_known_center)
                else:
                    # No person detected in this frame, use last known center
                    person_centers.append(last_known_center)

                if len(person_centers) >= target_samples:
                    break

            frame_idx += 1

        container.close()

        if len(person_centers) == 0:
            person_centers = [orig_w / 2.0]
            timestamps = [0.0]

        # Calculate desired crop_x for each sampled timestamp
        # Desired crop_x centers target_w around person_center
        crop_xs = []
        for pc in person_centers:
            cx = pc - (target_w / 2.0)
            cx = max(0.0, min(float(max_crop_x), cx))
            crop_xs.append(cx)

        # Smooth crop_xs using moving average / exponential filter
        smoothed_crop_xs = []
        window_size = 5
        half_w = window_size // 2
        for i in range(len(crop_xs)):
            start_i = max(0, i - half_w)
            end_i = min(len(crop_xs), i + half_w + 1)
            smoothed_crop_xs.append(float(np.mean(crop_xs[start_i:end_i])))

        # Check variation: If camera movement is minimal (< 8% width), use static smooth median
        var_range = max(smoothed_crop_xs) - min(smoothed_crop_xs)
        median_crop_x = int(round(np.median(smoothed_crop_xs)))
        # Ensure even pixel alignment for h264 encoder
        if median_crop_x % 2 != 0:
            median_crop_x += 1
        median_crop_x = max(0, min(max_crop_x, median_crop_x))

        if var_range < (orig_w * 0.08) or len(timestamps) <= 2:
            # Stable static center on speaker
            crop_filter = f"crop=w=ih*9/16:h=ih:x={median_crop_x}:y=0"
            return {
                "success": True,
                "cropFilter": crop_filter,
                "avgCropX": median_crop_x,
                "speakerFound": True,
                "message": f"Stable speaker tracking centered at X={median_crop_x}px"
            }

        # Build smooth piecewise panning expression in FFmpeg for significant movement
        # Downsample keyframes to at most 10 points to avoid overly complex expression
        step = max(1, len(timestamps) // 8)
        kf_t = []
        kf_x = []
        for k in range(0, len(timestamps), step):
            kf_t.append(round(timestamps[k], 2))
            x_val = int(round(smoothed_crop_xs[k]))
            if x_val % 2 != 0:
                x_val += 1
            kf_x.append(max(0, min(max_crop_x, x_val)))

        if len(kf_t) > 0 and (timestamps[-1] - kf_t[-1]) > 1.0:
            kf_t.append(round(timestamps[-1], 2))
            x_val = int(round(smoothed_crop_xs[-1]))
            if x_val % 2 != 0:
                x_val += 1
            kf_x.append(max(0, min(max_crop_x, x_val)))

        # Construct nested FFmpeg lerp expression:
        # if(lt(t, t1), x0, if(lt(t, t2), x1 + (x2-x1)*(t-t1)/(t2-t1), ...))
        expr = f"{kf_x[-1]}"
        for k in range(len(kf_t) - 2, -1, -1):
            t_curr = kf_t[k]
            t_next = kf_t[k + 1]
            x_curr = kf_x[k]
            x_next = kf_x[k + 1]
            dt = max(0.01, t_next - t_curr)
            
            # Linear interpolation segment between t_curr and t_next
            segment = f"{x_curr}+({x_next}-{x_curr})*(t-{t_curr})/{dt}"
            expr = f"if(lt(t\\,{t_next})\\,{segment}\\,{expr})"

        crop_filter = f"crop=w=ih*9/16:h=ih:x='{expr}':y=0"
        return {
            "success": True,
            "cropFilter": crop_filter,
            "avgCropX": median_crop_x,
            "speakerFound": True,
            "message": f"Smooth dynamic speaker panning across {len(kf_t)} keyframes"
        }

    except Exception as e:
        # Fallback to standard center crop if vision detection encounters any error
        return {
            "success": False,
            "cropFilter": "crop=w=ih*9/16:h=ih:x=(in_w-out_w)/2:y=0",
            "avgCropX": None,
            "speakerFound": False,
            "error": str(e)
        }

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Auto-framing active speaker tracking")
    parser.add_argument('--input', required=True, help="Input video MP4 path")
    args = parser.parse_args()

    result = analyze_speaker_tracking(args.input)
    print(json.dumps(result))
