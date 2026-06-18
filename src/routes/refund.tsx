import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund & Returns Policy — OffGridIt" },
      { name: "description", content: "OffGridIt returns, exchanges and refund policy. Items can be returned within 7 days of delivery." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <div className="container-px mx-auto max-w-3xl py-14">
      <h1 className="mb-2 text-4xl font-bold">Refund &amp; Returns Policy</h1>
      <p className="mb-10 text-sm text-muted-foreground">Last updated: June 2025</p>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">

        <p>
          We want you to be fully satisfied with your purchase. If something is not right, we are
          here to help. This policy is designed in accordance with the{" "}
          <strong className="text-foreground">Kenya Consumer Protection Act, 2012</strong>.
        </p>

        <section>
          <h2>1. Return Window</h2>
          <p>
            You may return most items within <strong className="text-foreground">7 days</strong> of the delivery date.
            To be eligible, the item must be:
          </p>
          <ul>
            <li>In its original, unopened packaging (for sealed items)</li>
            <li>Unused and in the same condition as received</li>
            <li>Accompanied by proof of purchase (order confirmation email or order ID)</li>
          </ul>
        </section>

        <section>
          <h2>2. Non-Returnable Items</h2>
          <p>The following cannot be returned unless faulty:</p>
          <ul>
            <li>Items that have been opened and used</li>
            <li>Software, digital downloads, or SIM cards</li>
            <li>Items damaged due to misuse, accidents, or unauthorised modification</li>
            <li>Items returned after 7 days of delivery</li>
          </ul>
        </section>

        <section>
          <h2>3. Faulty or Incorrect Items</h2>
          <p>
            If you receive a faulty, damaged, or incorrect item, please contact us within{" "}
            <strong className="text-foreground">48 hours</strong> of delivery with:
          </p>
          <ul>
            <li>Your order ID</li>
            <li>A clear description of the issue</li>
            <li>Photos or video showing the fault</li>
          </ul>
          <p className="mt-2">
            We will arrange a replacement or full refund at no cost to you, including return
            shipping where applicable.
          </p>
        </section>

        <section>
          <h2>4. How to Initiate a Return</h2>
          <ul>
            <li>Contact us via the <Link to="/contact" className="text-primary underline">Contact page</Link> or WhatsApp with your order ID and reason for return.</li>
            <li>We will confirm eligibility and provide return instructions within 2 business days.</li>
            <li>Pack the item securely in its original packaging.</li>
            <li>Drop off or arrange courier delivery to the address provided. Return shipping costs are the customer's responsibility unless the item is faulty.</li>
          </ul>
        </section>

        <section>
          <h2>5. Refund Processing</h2>
          <ul>
            <li>Once we receive and inspect the returned item, we will notify you of approval or rejection within 3 business days.</li>
            <li>Approved refunds are processed within <strong className="text-foreground">5–7 business days</strong> back to the original payment method (M-Pesa or card).</li>
            <li>Delivery fees are non-refundable unless the return is due to our error.</li>
          </ul>
        </section>

        <section>
          <h2>6. Exchanges</h2>
          <p>
            We offer exchanges for a different size, colour, or model where stock is available.
            If the replacement item is of higher value, you will be charged the difference. If
            lower, we will refund the difference.
          </p>
        </section>

        <section>
          <h2>7. Warranty Claims</h2>
          <p>
            For items that develop faults after the 7-day return window, please refer to the
            manufacturer's warranty. We can assist you in initiating a warranty claim with the
            relevant authorised service centre in Kenya.
          </p>
        </section>

        <section>
          <h2>8. Contact Us</h2>
          <p>
            For any returns or refund queries, <Link to="/contact" className="text-primary underline">contact us</Link> or
            reach us on WhatsApp. We aim to resolve all issues promptly and fairly.
          </p>
        </section>

      </div>
    </div>
  );
}
