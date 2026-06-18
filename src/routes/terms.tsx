import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — OffGridIt" },
      { name: "description", content: "Terms and conditions governing your use of the OffGridIt online store." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="container-px mx-auto max-w-3xl py-14">
      <h1 className="mb-2 text-4xl font-bold">Terms of Service</h1>
      <p className="mb-10 text-sm text-muted-foreground">Last updated: June 2025</p>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">

        <p>
          By accessing or purchasing from <strong className="text-foreground">offgridit.co.ke</strong> you agree to be bound by these
          Terms of Service. Please read them carefully before placing an order.
        </p>

        <section>
          <h2>1. About Us</h2>
          <p>
            OffGridIt is an online retail store selling consumer electronics and accessories in
            Kenya. Our registered business operates under Kenyan law.
          </p>
        </section>

        <section>
          <h2>2. Products and Pricing</h2>
          <ul>
            <li>All prices are displayed in <strong className="text-foreground">Kenya Shillings (KES)</strong> and are inclusive of applicable taxes.</li>
            <li>Prices are subject to change without notice. The price at the time of order confirmation is the price you pay.</li>
            <li>Product images are for illustration purposes. Actual products may differ slightly in appearance.</li>
            <li>We make every effort to display accurate stock information; however, availability is not guaranteed until your order is confirmed.</li>
          </ul>
        </section>

        <section>
          <h2>3. Orders</h2>
          <ul>
            <li>Placing an order constitutes an offer to purchase. We reserve the right to accept or decline any order.</li>
            <li>An order confirmation email signifies acceptance of your order.</li>
            <li>In the event of a pricing error, we will notify you before processing and give you the option to proceed at the correct price or cancel.</li>
            <li>We reserve the right to cancel orders suspected of fraud or abuse.</li>
          </ul>
        </section>

        <section>
          <h2>4. Payment</h2>
          <ul>
            <li>We accept <strong className="text-foreground">M-Pesa</strong> and major <strong className="text-foreground">debit/credit cards</strong>.</li>
            <li>Payment must be received in full before an order is dispatched.</li>
            <li>For M-Pesa payments, use your Order ID as the payment reference. Orders are processed once payment is confirmed.</li>
            <li>We do not store card details; all card transactions are handled by our secure payment processor.</li>
          </ul>
        </section>

        <section>
          <h2>5. Delivery</h2>
          <ul>
            <li>We deliver within Kenya. Delivery timelines are estimates and not guaranteed.</li>
            <li>Free delivery within Nairobi on orders over KES 50,000. Delivery fees apply for other orders and locations.</li>
            <li>Risk of loss passes to you upon delivery to the specified address.</li>
            <li>We are not responsible for delays caused by third-party courier services, weather, or events beyond our control.</li>
          </ul>
        </section>

        <section>
          <h2>6. Warranty</h2>
          <p>
            All products sold are genuine and carry the manufacturer's standard warranty unless
            otherwise stated. Warranty claims are handled by the respective manufacturers or their
            authorised service centres in Kenya.
          </p>
        </section>

        <section>
          <h2>7. Returns and Refunds</h2>
          <p>
            Please refer to our <Link to="/refund" className="text-primary underline">Refund Policy</Link> for full details on returns,
            exchanges and refunds.
          </p>
        </section>

        <section>
          <h2>8. Intellectual Property</h2>
          <p>
            All content on this website — including text, images, logos and software — is owned
            by or licensed to OffGridIt. You may not reproduce or redistribute any content
            without written permission.
          </p>
        </section>

        <section>
          <h2>9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by Kenyan law, OffGridIt is not liable for indirect,
            incidental or consequential damages arising from your use of this website or products
            purchased. Our total liability shall not exceed the amount you paid for the relevant
            order.
          </p>
        </section>

        <section>
          <h2>10. Governing Law</h2>
          <p>
            These terms are governed by the laws of Kenya. Any disputes shall be subject to the
            exclusive jurisdiction of the courts of Kenya.
          </p>
        </section>

        <section>
          <h2>11. Changes to These Terms</h2>
          <p>
            We may update these terms at any time. Continued use of the website after changes
            are posted constitutes your acceptance of the revised terms.
          </p>
        </section>

        <section>
          <h2>12. Contact</h2>
          <p>
            Questions about these terms? <Link to="/contact" className="text-primary underline">Contact us</Link>.
          </p>
        </section>

      </div>
    </div>
  );
}
