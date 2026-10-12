import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | clip.studio',
  description: 'Clip Studio Terms of Service. Review user guidelines, intellectual property terms, and YouTube API Services compliance.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0f1216] text-[#f6f7f8] flex flex-col font-sans selection:bg-[#dd2222] selection:text-white">
      
      {/* ======================================================== */}
      {/* PUBLIC HEADER NAVIGATION                                 */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#171a1f]/90 border-b border-[#2d3239]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group" title="clip.studio" aria-label="clip.studio">
            <img
              src="/logo.png"
              alt="clip.studio logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] object-cover border border-[#dd2222]/50 shadow-md group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center">
              <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                clip<span className="text-[#dd2222]">.studio</span>
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-4 sm:gap-6 text-xs font-semibold text-[#b9c0ca] shrink-0">
            <Link href="/" className="whitespace-nowrap hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/privacy" className="whitespace-nowrap hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link
              href="/dashboard"
              className="whitespace-nowrap px-4 py-2 rounded-lg bg-[#dd2222] hover:bg-[#b91c1c] text-white font-bold transition-colors shadow-md"
            >
              Open Studio
            </Link>
          </nav>

        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CONTENT                                             */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
        
        {/* Page Heading */}
        <div className="border-b border-[#2d3239] pb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#731111] bg-[#360c0c] text-[#fcf2f2] text-xs font-semibold uppercase tracking-wider">
            📜 User Agreement &amp; Policies
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-[#909cac]">
            <strong>Application:</strong> Clip Studio (<span className="text-white">clip.studio</span>) &bull;{' '}
            <strong>Effective Date:</strong> October 12, 2026 &bull;{' '}
            <strong>Last Updated:</strong> October 2026
          </p>
        </div>

        {/* Highlighted YouTube API Compliance Callout */}
        <section className="p-6 sm:p-7 rounded-2xl border-2 border-[#dd2222]/60 bg-gradient-to-br from-[#2a0c0c] via-[#1a1417] to-[#12151a] space-y-3 shadow-xl">
          <div className="flex items-center gap-2.5 text-[#dd2222] font-extrabold text-sm sm:text-base uppercase tracking-wider">
            <span>📺 YouTube API Services Terms of Service</span>
          </div>
          <p className="text-white text-sm sm:text-base font-semibold leading-relaxed">
            Clip Studio utilizes YouTube API Services to allow you to connect your channel, schedule posts, and upload videos.
          </p>
          <p className="text-xs sm:text-sm text-[#d7dbe0] leading-relaxed">
            By accessing or using Clip Studio to connect to YouTube, schedule videos, or publish content, you explicitly agree to be bound by the{' '}
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5ccae1] hover:underline font-bold"
            >
              YouTube Terms of Service
            </a>
            , and you acknowledge that your data is handled in accordance with the{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5ccae1] hover:underline font-bold"
            >
              Google Privacy Policy
            </a>.
          </p>
        </section>

        {/* Section 1: Agreement to Terms */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">1.</span> Acceptance of Terms
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;you&quot;, or &quot;your&quot;) and <strong>Clip Studio</strong> (&quot;clip.studio&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), governing your access to and use of the Clip Studio website at{' '}
            <a href="https://clip.studio" className="text-[#5ccae1] hover:underline font-medium">
              https://clip.studio
            </a>{' '}
            and our video clipping and automation applications.
          </p>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            By creating an account, browsing the website, or using our video tools, you agree to comply with and be bound by these Terms. If you do not agree to these Terms, you must not use or access Clip Studio.
          </p>
        </section>

        {/* Section 2: Description of Service */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">2.</span> Description of Service
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            Clip Studio provides an AI video clipping, editing, and automation platform that enables users to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            <li>Extract high-retention video segments from long-form YouTube videos.</li>
            <li>Automatically crop and frame active speakers into vertical 9:16 aspect ratio suitable for YouTube Shorts.</li>
            <li>Render clean, watermark-free 1080x1920 MP4 video files.</li>
            <li>Generate custom hook captions, animated text overlays, and SEO metadata.</li>
            <li><strong>Upload and manage your YouTube videos and Shorts</strong> directly to your connected YouTube channel via official Google OAuth.</li>
          </ul>
        </section>

        {/* Section 3: YouTube API Services & Google Integration */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">3.</span> YouTube API Services &amp; Google Integration
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            Clip Studio relies on YouTube API Services to allow you to authenticate, link your YouTube channel, and publish videos. By using any YouTube-related features on Clip Studio:
          </p>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            <li>
              You agree to be bound by the{' '}
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5ccae1] hover:underline font-semibold"
              >
                YouTube Terms of Service
              </a>.
            </li>
            <li>
              You acknowledge that Google user data accessed by Clip Studio is handled in accordance with our{' '}
              <Link href="/privacy" className="text-[#5ccae1] hover:underline font-semibold">
                Privacy Policy
              </Link>{' '}
              and the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5ccae1] hover:underline font-semibold"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </li>
            <li>
              You acknowledge that you can manage or revoke Clip Studio&apos;s access to your Google Account at any time via the{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5ccae1] hover:underline font-semibold"
              >
                Google Security Permissions page
              </a>.
            </li>
          </ul>
        </section>

        {/* Section 4: User Accounts & Security */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">4.</span> User Accounts &amp; Security
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            To use certain features, you may register an account or sign in with Google. You are responsible for safeguarding your login credentials and are fully responsible for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>
        </section>

        {/* Section 5: Intellectual Property & Content Ownership */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">5.</span> Content Ownership &amp; Copyright Compliance
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            <strong>Your Content:</strong> You retain all ownership rights to any video content, text overlays, and media assets that you create or import through Clip Studio. Clip Studio claims no ownership over your videos.
          </p>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            <strong>Copyright Warranty:</strong> You represent and warrant that you own or possess the necessary rights, licenses, consents, and fair-use permissions for any video or audio material you process, render, schedule, or upload through Clip Studio. You agree not to upload content that infringes upon any third-party copyrights, trademarks, or publicity rights.
          </p>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            <strong>YouTube Community Guidelines:</strong> Any video content you publish or schedule to YouTube through Clip Studio must strictly adhere to the YouTube Community Guidelines and policies.
          </p>
        </section>

        {/* Section 6: Prohibited Conduct */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">6.</span> Prohibited Activities
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            When using Clip Studio, you agree not to:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            <li>Use the service for any illegal, unlawful, defamatory, or abusive purpose.</li>
            <li>Circumvent or attempt to circumvent security controls, rate limits, or access permissions.</li>
            <li>Interfere with or disrupt the integrity or performance of Clip Studio&apos;s infrastructure.</li>
            <li>Use automated scrapers or bots to harvest data from the platform.</li>
            <li>Publish or distribute spam, fraudulent schemes, or malicious software.</li>
          </ul>
        </section>

        {/* Section 7: Disclaimers & Warranties */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">7.</span> Disclaimers of Warranties
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            Clip Studio is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis, without warranties of any kind, whether express, statutory, or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the service will be uninterrupted, error-free, or that video processing will always produce specific algorithmic reach or virality on third-party platforms.
          </p>
        </section>

        {/* Section 8: Limitation of Liability */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">8.</span> Limitation of Liability
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            To the maximum extent permitted by applicable law, Clip Studio and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, goodwill, or business opportunities arising out of or in connection with your use of or inability to use the service.
          </p>
        </section>

        {/* Section 9: Termination */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">9.</span> Termination &amp; Revocation
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            You may stop using Clip Studio at any time. You can disconnect your YouTube channel at any time in the Settings page, or revoke permissions via Google Security Settings. We reserve the right to suspend or terminate accounts that violate these Terms or pose a security risk to the platform.
          </p>
        </section>

        {/* Section 10: Modifications to Terms */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">10.</span> Changes to Terms
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            We reserve the right to modify these Terms at any time. Changes will be posted to this page with an updated &quot;Last Updated&quot; date. Your continued use of Clip Studio following any such revision constitutes your acceptance of the updated Terms.
          </p>
        </section>

        {/* Section 11: Contact Us */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">11.</span> Contact Information
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            If you have questions or concerns regarding these Terms of Service or our platform policies, please reach out to our team:
          </p>
          <div className="p-4 rounded-xl bg-[#0f1216] border border-[#2d3239] text-xs space-y-2 text-[#909cac]">
            <p>
              <strong className="text-white">Email:</strong>{' '}
              <a href="mailto:support@clip.studio" className="text-[#5ccae1] hover:underline">
                support@clip.studio
              </a>
            </p>
            <p>
              <strong className="text-white">Website:</strong>{' '}
              <a href="https://clip.studio" className="text-[#5ccae1] hover:underline">
                https://clip.studio
              </a>
            </p>
            <p>
              <strong className="text-white">Direct URL:</strong>{' '}
              <a href="https://clip.studio/terms" className="text-[#5ccae1] hover:underline">
                https://clip.studio/terms
              </a>
            </p>
          </div>
        </section>

      </main>

      {/* ======================================================== */}
      {/* PUBLIC FOOTER                                            */}
      {/* ======================================================== */}
      <footer className="w-full border-t border-[#2d3239] bg-[#12151a] py-10 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#909cac]">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-extrabold text-white text-base">
              clip<span className="text-[#dd2222]">.studio</span>
            </Link>
            <span className="text-[#39414b]">|</span>
            <span>AI Video Clipping &amp; YouTube Automation Studio</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-white font-semibold underline decoration-[#dd2222]">
              Terms of Service
            </Link>
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Google Limited Use Policy
            </a>
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              YouTube Terms
            </a>
          </div>

          <div className="text-[11px] text-[#6e7d91]">
            &copy; {new Date().getFullYear()} clip.studio &bull; All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
