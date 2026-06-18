import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Globe, HeartHandshake, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About OffGridIt — Premium Tech, Done Right" },
      {
        name: "description",
        content:
          "OffGridIt brings genuine, premium gadgets to Kenya with honest pricing, real warranties and human support. Learn our story.",
      },
    ],
  }),
  component: About,
});

const VALUES = [
  { icon: BadgeCheck, title: "Authenticity first", desc: "Every device is genuine, sealed and verified before it reaches you." },
  { icon: Zap, title: "Fast & reliable", desc: "Same-day delivery in Nairobi and quick shipping countrywide." },
  { icon: HeartHandshake, title: "Human support", desc: "Real people who actually help — before and after you buy." },
  { icon: Globe, title: "Built for Kenya", desc: "Local pricing in KES and M-Pesa checkout made simple." },
];

function About() {
  return (
    <div className="container-px mx-auto max-w-5xl py-16">
      <div className="max-w-2xl">
        <span className="text-sm font-semibold uppercase tracking-wide text-primary">Our story</span>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Premium tech, done right.</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          OffGridIt started with a simple frustration: buying great gadgets in Kenya was harder than
          it should be — counterfeits, unclear warranties and prices that made no sense. We set out to
          fix that.
        </p>
        <p className="mt-4 text-muted-foreground">
          Today we curate a tight selection of flagship phones, laptops, audio, wearables and the
          accessories that keep them running — all genuine, all warrantied, delivered fast. No clutter,
          no gimmicks. Just confident, product-forward tech retail you can trust.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-2xl border border-border bg-card p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <v.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">{v.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{v.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-8 text-center sm:p-12">
        <h2 className="text-2xl font-bold sm:text-3xl">Ready to upgrade?</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Explore our curated lineup of premium gadgets.
        </p>
        <Button variant="hero" size="lg" className="mt-6" asChild>
          <Link to="/shop">Shop the collection</Link>
        </Button>
      </div>
    </div>
  );
}
