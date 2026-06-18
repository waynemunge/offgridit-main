import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — OffGridIt" },
      { name: "description", content: "How OffGridIt collects, uses and protects your personal data under the Kenya Data Protection Act 2019." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="container-px mx-auto max-w-3xl py-14">
      <h1 className="mb-2 text-4xl font-bold">Privacy Policy</h1>
      <p className="mb-10 text-sm text-muted-foreground">Last updated: June 2025</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">

        <p>
          OffGridIt ("<strong className="text-foreground">we</strong>", "<strong className="text-foreground">us</strong>", "<strong className="text-foreground">our</strong>") is committed to protecting your personal data in
          accordance with the <strong className="text-foreground">Kenya Data Protection Act, 2019 (KDPA)</strong> and the Data
          Protection (General) Regulations, 2021. This policy explains what data we collect, why we
          collect it, and your rights as a data subject.
        </p>

        <section>
          <h2>1. Data Controller</h2>
          <p>
            OffGridIt is the data controller for personal information collected through this
            website. You can reach us via our <Link to="/contact" className="text-primary underline">Contact page</Link>.
          </p>
        </section>

        <section>
          <h2>2. Data We Collect</h2>
          <p>We collect the following categories of personal data:</p>
          <ul>
            <li><strong className="text-foreground">Account data:</strong> email address, display name (when you create an account)</li>
            <li><strong className="text-foreground">Order data:</strong> full name, phone number, delivery address, order history</li>
            <li><strong className="text-foreground">Payment data:</strong> payment method selection. Card and M-Pesa transactions are processed by third-party payment providers; we do not store card numbers</li>
            <li><strong className="text-foreground">Usage data:</strong> pages visited, products viewed (stored locally on your device)</li>
            <li><strong className="text-foreground">Communications:</strong> messages you send us via the contact form</li>
          </ul>
        </section>

        <section>
          <h2>3. Purpose and Legal Basis</h2>
          <ul>
            <li><strong className="text-foreground">Order fulfilment</strong> — to process, deliver and support your purchases (contractual necessity)</li>
            <li><strong className="text-foreground">Order confirmation emails</strong> — to notify you of purchase details (contractual necessity)</li>
            <li><strong className="text-foreground">Customer support</strong> — to respond to enquiries (legitimate interest)</li>
            <li><strong className="text-foreground">Service improvement</strong> — to understand how the site is used (legitimate interest)</li>
            <li><strong className="text-foreground">Marketing</strong> — newsletter updates, only with your explicit consent</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Sharing</h2>
          <p>
            We do not sell your personal data. We share it only where necessary with:
          </p>
          <ul>
            <li>Payment processors (M-Pesa / card networks) to complete transactions</li>
            <li>Email service providers (Resend) to deliver order confirmations</li>
            <li>Cloud infrastructure providers (Supabase, Vercel) that host this platform under strict data processing agreements</li>
            <li>Law enforcement or regulatory bodies when required by Kenyan law</li>
          </ul>
        </section>

        <section>
          <h2>5. Data Retention</h2>
          <p>
            We retain your personal data for as long as necessary to fulfil the purposes above,
            or as required by law. Order records are retained for 7 years for tax and legal
            compliance. You may request deletion of your account at any time.
          </p>
        </section>

        <section>
          <h2>6. Your Rights under the KDPA</h2>
          <p>As a data subject you have the right to:</p>
          <ul>
            <li><strong className="text-foreground">Access</strong> — request a copy of your personal data</li>
            <li><strong className="text-foreground">Rectification</strong> — correct inaccurate data</li>
            <li><strong className="text-foreground">Erasure</strong> — request deletion of your data where no legal obligation requires retention</li>
            <li><strong className="text-foreground">Data portability</strong> — receive your data in a structured, machine-readable format</li>
            <li><strong className="text-foreground">Object</strong> — object to processing based on legitimate interest</li>
            <li><strong className="text-foreground">Withdraw consent</strong> — at any time for consent-based processing (e.g. newsletter)</li>
          </ul>
          <p className="mt-2">
            To exercise any right, contact us via the <Link to="/contact" className="text-primary underline">Contact page</Link>.
            We will respond within 21 days as required by the KDPA.
          </p>
        </section>

        <section>
          <h2>7. Cookies</h2>
          <p>
            We use browser localStorage (not third-party cookies) to store your cart, wishlist,
            and recently viewed products entirely on your device. We do not use advertising or
            tracking cookies.
          </p>
        </section>

        <section>
          <h2>8. Security</h2>
          <p>
            We use industry-standard security measures including HTTPS encryption, row-level
            security on our database, and restricted access to personal data. However, no
            system is 100% secure, and we encourage you to use a strong, unique password.
          </p>
        </section>

        <section>
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be communicated
            via email or a notice on this website. Continued use of the site after changes
            constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2>10. Complaints</h2>
          <p>
            If you believe we have not handled your data correctly, you may lodge a complaint
            with the <strong className="text-foreground">Office of the Data Protection Commissioner (ODPC)</strong> at{" "}
            <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer" className="text-primary underline">odpc.go.ke</a>.
          </p>
        </section>

      </div>
    </div>
  );
}
