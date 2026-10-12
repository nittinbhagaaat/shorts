import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | clip.studio',
  description: 'Clip Studio Privacy Policy and Google API Services User Data Policy disclosure. Learn how we protect your data and comply with Limited Use requirements.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0f1216] text-[#f6f7f8] flex flex-col font-sans selection:bg-[#dd2222] selection:text-white">
      
      {/* ======================================================== */}
      {/* PUBLIC HEADER NAVIGATION                                 */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#171a1f]/90 border-b border-[#2d3239]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group" title="clip.studio" aria-label="clip.studio">
            <img
              src="/logo.png"
              alt="clip.studio logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] object-cover border border-[#dd2222]/50 shadow-md group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                clip<span className="text-[#dd2222]">.studio</span>
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-4 sm:gap-6 text-xs font-semibold text-[#b9c0ca]">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-[#dd2222] hover:bg-[#b91c1c] text-white font-bold transition-colors shadow-md"
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
            🛡️ Transparency &amp; User Privacy
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-[#909cac]">
            <strong>Application:</strong> Clip Studio (<span className="text-white">clip.studio</span>) &bull;{' '}
            <strong>Effective Date:</strong> October 12, 2026 &bull;{' '}
            <strong>Last Updated:</strong> October 2026
          </p>
        </div>

        {/* Highlighted Google Limited Use Callout Box (Critical for OAuth Verification) */}
        <section className="p-6 sm:p-7 rounded-2xl border-2 border-[#dd2222]/60 bg-gradient-to-br from-[#2a0c0c] via-[#1a1417] to-[#12151a] space-y-3 shadow-xl">
          <div className="flex items-center gap-2.5 text-[#dd2222] font-extrabold text-sm sm:text-base uppercase tracking-wider">
            <span>⚖️ Google API Services User Data Policy Compliance</span>
          </div>
          <p className="text-white text-sm sm:text-base font-semibold leading-relaxed">
            &ldquo;We will only use the Google user data we collect for Limited Use purposes.&rdquo;
          </p>
          <p className="text-xs sm:text-sm text-[#d7dbe0] leading-relaxed">
            Clip Studio&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5ccae1] hover:underline font-bold"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        {/* Section 1: Introduction & App Overview */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">1.</span> Introduction &amp; Application Functionality
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            Welcome to <strong>Clip Studio</strong> (&quot;clip.studio&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). 
            Clip Studio is an AI video clipping and automation platform that empowers content creators to transform long-form video content into viral 9:16 vertical Shorts, schedule publication times, and <strong>upload and manage YouTube videos and Shorts</strong> directly to their authorized YouTube channels.
          </p>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            This Privacy Policy describes how we collect, access, use, store, share, and protect your information when you access or use our website located at{' '}
            <a href="https://clip.studio" className="text-[#5ccae1] hover:underline font-medium">
              https://clip.studio
            </a>{' '}
            and our associated services. We are dedicated to maintaining the confidentiality, integrity, and security of all user data.
          </p>
        </section>

        {/* Section 2: Google & YouTube User Data Accessed */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">2.</span> Google User Data &amp; YouTube API Scopes Accessed
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            Clip Studio integrates with Google APIs and YouTube API Services to allow you to authenticate into your account and publish video clips directly to your YouTube channel. When you connect your Google Account or YouTube channel, we request only the minimal permissions required to deliver our core features:
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-xl bg-[#0f1216] border border-[#2d3239] space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-[11px] sm:text-xs font-mono text-[#dd2222] bg-[#360c0c] px-2 py-0.5 rounded border border-[#731111]/60">
                  https://www.googleapis.com/auth/youtube.upload
                </code>
                <span className="text-xs font-bold text-white">Upload YouTube Videos</span>
              </div>
              <p className="text-xs text-[#909cac] leading-relaxed">
                <strong>Purpose:</strong> Allows Clip Studio to upload and publish user-created vertical shorts, set video titles, descriptions, tags, and configure privacy status (e.g., public, unlisted, private) exclusively upon your explicit initiation or scheduled request.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0f1216] border border-[#2d3239] space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-[11px] sm:text-xs font-mono text-[#dd2222] bg-[#360c0c] px-2 py-0.5 rounded border border-[#731111]/60">
                  https://www.googleapis.com/auth/youtube.readonly
                </code>
                <span className="text-xs font-bold text-white">View YouTube Channel Information</span>
              </div>
              <p className="text-xs text-[#909cac] leading-relaxed">
                <strong>Purpose:</strong> Allows Clip Studio to read your connected channel&apos;s title, channel ID, and avatar so you can confirm which channel is active, and verify the status of scheduled or completed video uploads.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0f1216] border border-[#2d3239] space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-[11px] sm:text-xs font-mono text-[#dd2222] bg-[#360c0c] px-2 py-0.5 rounded border border-[#731111]/60">
                  openid, profile, email
                </code>
                <span className="text-xs font-bold text-white">User Authentication</span>
              </div>
              <p className="text-xs text-[#909cac] leading-relaxed">
                <strong>Purpose:</strong> Used solely to authenticate your identity when you choose to sign in to Clip Studio using Google OAuth, display your profile name and email in your account dashboard, and link your workspaces.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: How We Use Google User Data */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">3.</span> How We Access, Use, and Process Google User Data
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            We access and process your Google user data solely to provide the services you specifically request. Specifically:
          </p>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            <li>
              <strong>User-Initiated Publishing:</strong> We access your YouTube channel only when you explicitly click to upload a short or set a scheduled release time.
            </li>
            <li>
              <strong>Channel Identity:</strong> We retrieve your channel name and thumbnail to display your connected channel in your workspace settings, ensuring you always know where your content is being uploaded.
            </li>
            <li>
              <strong>Upload Status Verification:</strong> We check upload processing status to notify you when your YouTube Short is live or scheduled.
            </li>
          </ul>

          <div className="p-4 rounded-xl bg-[#0f1216] border border-[#2d3239] space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Strict Negative Covenants &amp; Restrictions:
            </h3>
            <ul className="list-disc list-inside space-y-1 text-xs text-[#909cac] leading-relaxed">
              <li>We <strong>DO NOT</strong> sell, rent, lease, trade, or monetize Google user data under any circumstances.</li>
              <li>We <strong>DO NOT</strong> use Google user data for advertising, retargeting, promotional campaigns, or consumer profiling.</li>
              <li>We <strong>DO NOT</strong> use Google user data to train generalized artificial intelligence (AI) or machine learning models.</li>
              <li>We <strong>DO NOT</strong> read, inspect, or store private emails, personal contacts, search history, browsing data, or non-ClipStudio videos.</li>
            </ul>
          </div>
        </section>

        {/* Section 4: How We Store and Protect Google User Data */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">4.</span> Storage, Security &amp; Protection of Google User Data
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            Clip Studio implements robust technical, organizational, and physical security measures to safeguard Google user data against unauthorized access, loss, alteration, or disclosure:
          </p>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            <li>
              <strong>Encryption at Rest:</strong> OAuth 2.0 access tokens and refresh tokens are stored in encrypted database records using industry-standard AES-256 encryption.
            </li>
            <li>
              <strong>Encryption in Transit:</strong> All communications between your browser, our servers, and Google API servers are encrypted using TLS 1.3 / HTTPS.
            </li>
            <li>
              <strong>Restricted Access:</strong> Access to tokens is strictly limited to automated backend background workers executing user-commanded upload tasks.
            </li>
          </ul>
        </section>

        {/* Section 5: Third-Party Sharing and Data Transfers */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">5.</span> Third-Party Sharing &amp; Data Transfers
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            <strong>We do not share, sell, rent, or transfer Google user data to any third parties.</strong>
          </p>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            Google user data is transmitted exclusively to Google&apos;s own YouTube API endpoints to carry out the upload and channel status check tasks that you explicitly trigger. We do not provide access to Google user data to external data brokers, third-party analytics vendors, advertising partners, or any unauthorized external parties.
          </p>
        </section>

        {/* Section 6: Data Retention & User Deletion Rights */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">6.</span> Data Retention &amp; User Deletion Rights
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            We retain your Google OAuth credentials only for as long as your YouTube channel remains actively connected to Clip Studio:
          </p>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            <li>
              <strong>Self-Service Account Disconnection:</strong> You can disconnect your YouTube channel at any time by going to the Settings page in your Clip Studio dashboard. Disconnecting your channel instantly and permanently deletes all stored OAuth tokens, refresh tokens, and channel metadata from our database.
            </li>
            <li>
              <strong>Permanent Account Deletion:</strong> You may request complete deletion of your Clip Studio account and all associated user data at any time by emailing{' '}
              <a href="mailto:support@clip.studio" className="text-[#5ccae1] hover:underline font-medium">
                support@clip.studio
              </a>{' '}
              or{' '}
              <a href="mailto:privacy@clip.studio" className="text-[#5ccae1] hover:underline font-medium">
                privacy@clip.studio
              </a>. All associated records will be permanently purged within 48 hours.
            </li>
          </ul>
        </section>

        {/* Section 7: How Users Can Revoke Access */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">7.</span> How Users Can Revoke Google Access
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            You maintain full control over Clip Studio&apos;s access to your Google Account. You can revoke access at any time through the official Google Security permissions dashboard:
          </p>
          <div className="p-4 rounded-xl bg-[#0f1216] border border-[#2d3239] space-y-2">
            <p className="text-xs text-[#909cac]">Google Account Permissions Management:</p>
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#5ccae1] hover:underline font-mono font-bold break-all"
            >
              <span>https://myaccount.google.com/permissions</span>
              <span>↗</span>
            </a>
            <p className="text-[11px] text-[#6e7d91] pt-1">
              Revoking access immediately terminates Clip Studio&apos;s ability to interact with your YouTube channel.
            </p>
          </div>
        </section>

        {/* Section 8: YouTube API Services Terms of Service */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">8.</span> YouTube API Services Terms of Service
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            Clip Studio uses YouTube API Services. By connecting your YouTube account and using Clip Studio to upload and manage YouTube content, you agree to be bound by the{' '}
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5ccae1] hover:underline font-semibold"
            >
              YouTube Terms of Service
            </a>{' '}
            and acknowledge that your data is processed in accordance with the{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5ccae1] hover:underline font-semibold"
            >
              Google Privacy Policy
            </a>.
          </p>
        </section>

        {/* Section 9: Other Information We Collect */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">9.</span> Other Information We Collect
          </h2>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            <li>
              <strong>Account Information:</strong> If you register via email, we store your name, email address, and a securely salted bcrypt password hash.
            </li>
            <li>
              <strong>Project &amp; Workspace Data:</strong> Information regarding video projects you create, such as video URLs, clip timestamps, text overlay presets, and rendering history.
            </li>
            <li>
              <strong>Local Browser Storage:</strong> For your privacy, custom user settings (such as private AI API keys) may be stored locally in your browser&apos;s <code className="bg-[#0f1216] px-1 py-0.5 rounded text-[11px] text-white">localStorage</code> and never sent to our servers.
            </li>
            <li>
              <strong>Log Data:</strong> Technical logs including IP addresses, browser user agent, and timestamp data used solely for DDoS mitigation, bug diagnostics, and service security.
            </li>
          </ul>
        </section>

        {/* Section 10: Children's Privacy */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">10.</span> Children&apos;s Privacy (COPPA Compliance)
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            Clip Studio is not directed to individuals under the age of 13 (or under 16 in certain jurisdictions). We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal data, please contact us immediately, and we will promptly remove such information.
          </p>
        </section>

        {/* Section 11: Changes to this Privacy Policy */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">11.</span> Changes to This Privacy Policy
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            We may update this Privacy Policy from time to time to reflect operational, legal, or regulatory changes. Any updates will be posted on this page with an updated revision date. We encourage you to review this page periodically to stay informed about our data practices.
          </p>
        </section>

        {/* Section 12: Contact Us */}
        <section className="bg-[#171a1f] border border-[#2d3239] p-6 sm:p-8 rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#dd2222]">12.</span> Contact Us
          </h2>
          <p className="text-xs sm:text-sm text-[#b9c0ca] leading-relaxed">
            If you have any questions, concerns, or requests regarding this Privacy Policy, our data practices, or our compliance with the Google API Services User Data Policy, please contact our privacy team:
          </p>
          <div className="p-4 rounded-xl bg-[#0f1216] border border-[#2d3239] text-xs space-y-2 text-[#909cac]">
            <p>
              <strong className="text-white">Email:</strong>{' '}
              <a href="mailto:support@clip.studio" className="text-[#5ccae1] hover:underline">
                support@clip.studio
              </a>{' '}
              / {' '}
              <a href="mailto:privacy@clip.studio" className="text-[#5ccae1] hover:underline">
                privacy@clip.studio
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
              <a href="https://clip.studio/privacy" className="text-[#5ccae1] hover:underline">
                https://clip.studio/privacy
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
            <Link href="/privacy" className="text-white font-semibold underline decoration-[#dd2222]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
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
