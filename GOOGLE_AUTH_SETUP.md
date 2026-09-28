# 🚀 Step-by-Step Guide: Google OAuth2 Client ID & Secret for YouTube Shorts

This guide explains how to create and configure your **Google OAuth 2.0 Client ID** and **Client Secret** in the Google Cloud Console to enable YouTube Shorts publishing and scheduling directly from this platform.

---

## 📌 Prerequisites

- A standard **Google Account** with an active **YouTube Channel**.
- The app running locally at `http://localhost:3000` (or your production domain).

---

## 🛠️ Step 1: Open Google Cloud Console & Create a Project

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Sign in with the Google Account that owns or manages your YouTube channel.
3. At the top of the page, click the **Project Dropdown** (next to the "Google Cloud" logo) and click **"New Project"**.
4. Fill in:
   - **Project Name:** `Shorts AI Studio` (or any name you prefer).
   - **Organization / Location:** Leave as default / "No organization".
5. Click **Create** and wait a few seconds for the project to provision.
6. Make sure your new project is selected in the top dropdown.

---

## 🔌 Step 2: Enable the YouTube Data API v3

1. In the left navigation menu (hamburger icon ☰), go to **APIs & Services** > **Library** (or search for *"YouTube Data API v3"* in the top search bar).
2. Click on **YouTube Data API v3**.
3. Click the blue **Enable** button.
4. Wait until the API is enabled and you are redirected to the API Overview page.

---

## 🛡️ Step 3: Configure the OAuth Consent Screen, Scopes & Test Users

Google Cloud Console has two versions of this interface depending on your account state and console updates: the **Classic 4-Step Wizard** or the new **Google Auth Platform** tabbed layout. This section provides exact navigation for both.

> 🔗 **Direct Shortcut to OAuth Consent Screen:**  
> [https://console.cloud.google.com/apis/credentials/consent](https://console.cloud.google.com/apis/credentials/consent)

---

### 📍 How to Navigate There from Any Page:
1. Look at the top-left corner and click the **☰ (Navigation Menu / 3 horizontal bars)**.
2. In the menu, look for:
   - **APIs & Services** ➔ click **OAuth consent screen**
   - *(Or in the latest Google Cloud update:)* Look for **Google Auth Platform** in the left menu.

---

### 🧭 Part A: Where is "User Type" (Internal vs. External)?

Depending on whether this project already had a consent screen created:

#### Case 1: You see the "User Type" choice with 2 radio buttons:
- **Internal:** Greyed out / disabled unless you are using a paid Google Workspace enterprise account.
- **External:** **Select this radio button.** (Allows any standard `@gmail.com` account to sign in).
- Click the blue **CREATE** button at the bottom.

#### Case 2: You DO NOT see "User Type" at all:
- **Why?** It means an OAuth consent screen was **already initialized** in this Google Cloud project!
- You will see a dashboard/overview displaying:
  - **Publishing status:** `Testing`
  - **User type:** `External` (already selected!)
- **What to do next:**
  - Look near the top of the page and click the **EDIT APP** button (this will open the step-by-step editor).
  - *Or* if your left sidebar shows tabs like **Branding**, **Audience**, and **Data Access**, use those tabs directly as explained below!

---

### 📝 Part B: Filling Basic App Information (Step 1 or "Branding" Tab)

1. **App name:** Type `Shorts Studio` (or any name).
2. **User support email:** Click the dropdown and choose your own Gmail address.
3. **App logo:** Leave blank.
4. **App domain:** Leave all boxes blank.
5. **Developer contact information:** Scroll to the bottom and enter your email address in the **Email addresses** box.
6. ⚠️ **IMPORTANT:** Scroll all the way to the bottom and click the blue **SAVE AND CONTINUE** button.  
   *(You must click this button to move forward to the Scopes screen!)*

---

### 🔍 Part C: How to Find and Add "Scopes" (Step 2 or "Data Access" Tab)

Scopes define what permissions your app requests from Google (uploading video and viewing profile).

#### If you are in the Step-by-Step Wizard (Screen titled "Scopes"):
1. Right beneath the title, look for the big button:
   👉 **`[ + ADD OR REMOVE SCOPES ]`**  
   *(A panel drawer will slide out from the right side of your screen).*
2. **Method 1: Search & Filter:**
   - In the **Filter** box inside the right-hand panel, type `youtube` and hit Enter.
   - Find and check the boxes for:
     - ☑️ `.../auth/youtube.upload` *(Upload YouTube videos and manage your YouTube videos)*
     - ☑️ `.../auth/youtube.readonly` *(View your YouTube account)*
     - ☑️ `.../auth/userinfo.profile` *(See your personal info)*
3. **Method 2: Quick Copy-Paste (Easiest & Most Reliable):**
   - In that same right-side panel, scroll down to the bottom box labeled **"Manually add scopes"**.
   - Copy and paste these 3 lines directly into the box:
     ```text
     https://www.googleapis.com/auth/youtube.upload
     https://www.googleapis.com/auth/youtube.readonly
     https://www.googleapis.com/auth/userinfo.profile
     ```
   - Click the **ADD TO TABLE** button right next to it.
4. Click the blue **UPDATE** button at the very bottom of the slide-out panel.
5. Scroll down to the bottom of the page and click **SAVE AND CONTINUE**.

#### If you see the New Google Auth Platform layout (Left sub-menu tabs):
1. In the left sub-menu under *Google Auth Platform*, click **Data Access**.
2. Click **Add or remove scopes** near the top.
3. In the slide-out drawer, manually paste the 3 scope URLs above into the **Manually add scopes** box and click **Add to table**.
4. Click **Update**, then click **Save**.

---

### 👤 Part D: Adding "Test Users" (Step 3 or "Audience" Tab)

> ⚠️ **CRITICAL REQUIREMENT:** While your app's publishing status is in **"Testing"** mode (which is default), Google strictly blocks all accounts with **Error 403: access_denied** UNLESS you explicitly whitelist your email here.

#### If you are in the Wizard (Screen titled "Test users"):
1. Under the "Test users" header, click the **`+ ADD USERS`** button.
2. In the text field, type your **exact Gmail address** (the Google account that manages your YouTube channel).
3. Click **ADD**.
4. You will see your email listed in the table.
5. Scroll down and click **SAVE AND CONTINUE**.

#### If you see the New Google Auth Platform layout:
1. In the left sub-menu under *Google Auth Platform*, click **Audience**.
2. Scroll down to the **Test users** section.
3. Click **+ ADD USERS**, type your email address, and click **Save**.

---

### ✅ Part E: Finish Step 3
- You will see a **Summary** page reviewing all your inputs.
- Scroll to the bottom and click **BACK TO DASHBOARD**.
- Your OAuth consent screen is now fully configured!

---

## 🔑 Step 4: Create OAuth 2.0 Web Client Credentials

> 🔗 **Direct Shortcut to Credentials Page:**  
> [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)

1. In the left sidebar, go to **APIs & Services** > **Credentials**.
2. Click **+ CREATE CREDENTIALS** at the top and select **OAuth client ID**.
3. Fill out the form:
   - **Application type:** Select **Web application**.
   - **Name:** `Shorts Web Client`
   - **Authorized JavaScript origins:**
     - Click **+ ADD URI**.
     - Enter: `http://localhost:3000`
   - **Authorized redirect URIs:**
     - Click **+ ADD URI**.
     - Enter: `http://localhost:3000/api/youtube/callback`
       *(Note: Must match exactly, including `http://` and no trailing slash)*.
4. Click **Create**.
5. A modal will pop up with:
   - **Client ID** (e.g. `79839125649-xxxxxxxx.apps.googleusercontent.com`)
   - **Client Secret** (e.g. `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`)
6. Copy both values.

---

## ⚙️ Step 5: Configure Credentials in the Application

You can configure your credentials using either of the following two methods:

### Method A: Using `.env.local` (Recommended)

1. Open `.env.local` in the root of the project.
2. Add or update the following variables:

```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

3. Save the file. (Next.js automatically loads these variables).

---

### Method B: Directly in Application Settings (UI)

1. Open the app in your browser: [http://localhost:3000/settings](http://localhost:3000/settings)
2. Scroll to **Section 5: YouTube Shorts Channel Integration**.
3. Under **Google OAuth Credentials & Redirect URI**, paste your:
   - **Google Client ID**
   - **Google Client Secret**
4. Click **Save Configuration** at the top or bottom of the page.

---

## 🎬 Step 6: Connect Channel & Upload Shorts

1. Go to **Settings** (`/settings`) > **Section 5: YouTube Shorts Channel Integration**.
2. Click the red **Connect YouTube Channel** button.
3. You will be redirected to Google's sign-in page:
   - Choose the Google account you added as a **Test User** in Step 3.
   - If you see a warning screen saying *"Google hasn't verified this app"*, click **Advanced** > **Go to Shorts Studio (unsafe)**.
   - Select all requested permissions (View & manage YouTube videos).
   - Click **Continue**.
4. You will be redirected back to `/settings` with a green banner:
   > *✓ Successfully connected YouTube channel "[Your Channel Name]"!*
5. Open any project (`/project/[id]`), select a viral clip, and click **"Upload to YouTube Short"** right below the preview player to publish or schedule!

---

## ❓ Troubleshooting & FAQs

### 1. Error: `redirect_uri_mismatch`
- **Cause:** The redirect URI in Google Cloud Console does not exactly match what the app is requesting.
- **Fix:** In Google Cloud Console > **Credentials** > click your Web Client > under **Authorized redirect URIs**, make sure `http://localhost:3000/api/youtube/callback` is added with **exact casing and no trailing slash**.

### 2. Error: `Access blocked: App has not completed the Google verification process` (Error 403: access_denied)
- **Cause:** Your app is in "Testing" mode and your Google account was not added as a test user.
- **Fix:** Go to Google Cloud Console > **OAuth consent screen** > scroll down to **Test users** > click **Add users** and enter the email address you are logging in with.

### 3. Error: `Token has been expired or revoked`
- **Cause:** Google refresh token expired or permission was revoked.
- **Fix:** Go to `/settings`, click **Disconnect**, and then click **Connect YouTube Channel** to re-authenticate.

### 4. YouTube API Daily Quota Limits
- **Free Tier:** Google grants **10,000 quota units per day** for free.
- **Upload Cost:** Uploading a video via `videos.insert` consumes **1,600 units**.
- This allows you to upload **~6 Shorts per day** on the free tier. If you need more daily uploads, you can request a quota increase in Google Cloud Console under YouTube Data API v3 > Quotas.
