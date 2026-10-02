import DashboardLayout from '@/components/DashboardLayout';

export default function TermsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-10 px-6 text-[#c5d1de]">
        <div className="mb-8 border-b border-[#22272e] pb-6">
          <h1 className="text-3xl font-extrabold text-white mb-2">Terms of Service</h1>
          <p className="text-sm text-[#909cac]">Last updated: October 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed">
          <section className="bg-[#161b22] border border-[#262c36] p-6 rounded-xl">
            <h2 className="text-lg font-bold text-white mb-3">1. Terms Acceptance</h2>
            <p>
              By accessing and using Clip Studio, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section className="bg-[#161b22] border border-[#262c36] p-6 rounded-xl">
            <h2 className="text-lg font-bold text-white mb-3">2. YouTube Terms of Service</h2>
            <p>
              By using Clip Studio to interact with YouTube content and publish videos, you also agree to be bound by the{' '}
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#388bfd] hover:underline"
              >
                YouTube Terms of Service
              </a>
              .
            </p>
          </section>

          <section className="bg-[#161b22] border border-[#262c36] p-6 rounded-xl">
            <h2 className="text-lg font-bold text-white mb-3">3. Use License &amp; Copyright</h2>
            <p>
              Users are responsible for ensuring they have appropriate rights or fair use permissions for any content processed or published through Clip Studio.
            </p>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
