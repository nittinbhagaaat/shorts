import DashboardLayout from '@/components/DashboardLayout';

export default function PrivacyPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-10 px-6 text-[#c5d1de]">
        <div className="mb-8 border-b border-[#22272e] pb-6">
          <h1 className="text-3xl font-extrabold text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-[#909cac]">Last updated: October 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed">
          <section className="bg-[#161b22] border border-[#262c36] p-6 rounded-xl">
            <h2 className="text-lg font-bold text-white mb-3">1. Introduction</h2>
            <p>
              Clip Studio (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how our AI video clipping and YouTube Shorts automation application collects, uses, and safeguards your information when you use our service.
            </p>
          </section>

          <section className="bg-[#161b22] border border-[#262c36] p-6 rounded-xl">
            <h2 className="text-lg font-bold text-white mb-3">2. Google &amp; YouTube API Data Access</h2>
            <p className="mb-3">
              Clip Studio uses YouTube API Services to allow you to connect your YouTube channel and publish AI-generated Shorts directly to your channel.
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#909cac]">
              <li><strong className="text-white">Scopes Requested:</strong> We request access to <code className="bg-[#22272e] px-1 py-0.5 rounded text-xs text-red-400">youtube.upload</code> and <code className="bg-[#22272e] px-1 py-0.5 rounded text-xs text-red-400">youtube.readonly</code> solely to upload videos you explicitly choose to publish, and to check your channel name and upload status.</li>
              <li><strong className="text-white">Data Storage:</strong> OAuth access and refresh tokens are stored securely on your server database solely to authenticate your upload requests. We never sell, lease, or share your Google user data with any third parties.</li>
              <li><strong className="text-white">Data Retention:</strong> You can disconnect your YouTube account at any time from the Settings page, which permanently deletes your stored OAuth tokens from the database.</li>
            </ul>
          </section>

          <section className="bg-[#161b22] border border-[#262c36] p-6 rounded-xl">
            <h2 className="text-lg font-bold text-white mb-3">3. Revoking Access</h2>
            <p className="mb-3">
              You can revoke Clip Studio&apos;s access to your Google Account at any time through the Google Security Settings page at:
            </p>
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#388bfd] hover:underline"
            >
              https://myaccount.google.com/permissions
            </a>
          </section>

          <section className="bg-[#161b22] border border-[#262c36] p-6 rounded-xl">
            <h2 className="text-lg font-bold text-white mb-3">4. Google API Services User Data Policy</h2>
            <p>
              Clip Studio&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#388bfd] hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section className="bg-[#161b22] border border-[#262c36] p-6 rounded-xl">
            <h2 className="text-lg font-bold text-white mb-3">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us through our platform support.
            </p>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
