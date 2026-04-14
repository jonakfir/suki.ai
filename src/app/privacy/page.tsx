export const metadata = {
  title: "Privacy Policy — suki.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-[var(--foreground)]">
      <h1 className="text-3xl font-light mb-2">Privacy Policy</h1>
      <p className="text-sm opacity-60 mb-10">Last updated: April 13, 2026</p>

      <div className="space-y-8 text-sm leading-relaxed opacity-80">
        <section>
          <h2 className="text-lg font-medium mb-2 opacity-100">What we collect</h2>
          <p>
            When you create an account, we store your email address and the skin
            profile you build during onboarding (skin type, concerns, tone, age
            range, known allergies, budget preference, and routine complexity).
            We also store products you log and the ratings you give them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2 opacity-100">How we use it</h2>
          <p>
            Your data is used solely to generate personalized skincare
            recommendations and routines. We send your skin profile and product
            history to our AI service to produce tailored suggestions. We do not
            sell, rent, or share your personal data with third parties for
            marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2 opacity-100">Third-party services</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Supabase</strong> — authentication and database hosting
              (your data is stored securely with row-level security)
            </li>
            <li>
              <strong>Anthropic (Claude)</strong> — AI model used to generate
              recommendations and routines (your profile data is sent to generate
              responses but is not stored by Anthropic)
            </li>
            <li>
              <strong>Open Beauty Facts</strong> — open-source product database
              used for ingredient lookups (no personal data is sent)
            </li>
            <li>
              <strong>Vercel</strong> — application hosting
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2 opacity-100">Data security</h2>
          <p>
            All data is transmitted over HTTPS. Database access is protected by
            row-level security policies — you can only access your own data. We
            do not store passwords directly; authentication is handled by
            Supabase Auth.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2 opacity-100">Your rights</h2>
          <p>
            You can view, edit, or delete your skin profile and product data at
            any time from within the app. To delete your account entirely,
            contact us at the email below and we will remove all your data within
            30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2 opacity-100">Children</h2>
          <p>
            suki. is not directed at children under 13. We do not knowingly
            collect data from children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2 opacity-100">Changes</h2>
          <p>
            We may update this policy from time to time. We will notify you of
            material changes by updating the date at the top of this page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2 opacity-100">Contact</h2>
          <p>
            Questions about this policy? Email us at{" "}
            <a
              href="mailto:jonakfir@gmail.com"
              className="underline opacity-100"
            >
              jonakfir@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
