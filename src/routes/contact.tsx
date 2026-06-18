import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact OffGridIt — We're Here to Help" },
      {
        name: "description",
        content:
          "Get in touch with OffGridIt. Questions about products, orders or warranty? Reach our Kenya-based support team by phone, email or message.",
      },
    ],
  }),
  component: Contact,
});

const INFO = [
  { icon: Phone, label: "Call us", value: "+254 700 000 000" },
  { icon: Mail, label: "Email", value: "hello@offgridit.com" },
  { icon: MapPin, label: "Visit", value: "Nairobi, Kenya" },
  { icon: Clock, label: "Hours", value: "Mon–Sat, 9am–6pm" },
];

function Contact() {
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you within 24 hours.");
    (e.target as HTMLFormElement).reset();
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
              <Input id="cname" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cemail">Email</Label>
              <Input id="cemail" type="email" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="csubject">Subject</Label>
            <Input id="csubject" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cmsg">Message</Label>
            <Textarea id="cmsg" rows={5} required />
          </div>
          <Button type="submit" variant="hero" size="lg">
            Send message
          </Button>
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
