import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PHONE_DISPLAY, WHATSAPP_URL, seo } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () =>
    seo({
      title: "Contact OffGridIt — We're Here to Help",
      description:
        "Get in touch with OffGridIt. Questions about products, orders or warranty? Reach our Kenya-based support team by phone, email or message.",
      path: "/contact",
    }),
  component: Contact,
});

const INFO = [
  { icon: Phone, label: "Call or WhatsApp", value: PHONE_DISPLAY },
  { icon: Mail, label: "Email", value: "hello@offgridit.com" },
  { icon: MapPin, label: "Visit", value: "Nairobi, Kenya" },
  { icon: Clock, label: "Hours", value: "Mon–Sat, 9am–6pm" },
];

function Contact() {
  // No message inbox yet: the form opens WhatsApp with the message ready to send,
  // the same channel used to follow up on orders.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const subject = String(fd.get("subject") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();
    const text = [`Hi OffGridIt, I'm ${name}.`, subject && `Subject: ${subject}`, message]
      .filter(Boolean)
      .join("\n\n");
    window.open(
      `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="container-px mx-auto max-w-5xl py-16">
      <div className="max-w-2xl">
        <span className="text-sm font-semibold uppercase tracking-wide text-primary">Contact</span>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Let's talk.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Questions about a product, your order or warranty? Our team is ready to help.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cname">Name</Label>
              <Input id="cname" name="name" autoComplete="name" maxLength={100} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="csubject">Subject</Label>
              <Input id="csubject" name="subject" maxLength={120} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cmsg">Message</Label>
            <Textarea id="cmsg" name="message" rows={5} maxLength={1500} required />
          </div>
          <Button type="submit" variant="hero" size="lg">
            <MessageCircle className="h-5 w-5" /> Send on WhatsApp
          </Button>
          <p className="text-sm text-muted-foreground">
            Opens WhatsApp with your message ready to send to {PHONE_DISPLAY}.
          </p>
        </form>

        <aside className="space-y-4">
          {INFO.map((i) => (
            <div
              key={i.label}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <i.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{i.label}</p>
                <p className="font-medium">{i.value}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
