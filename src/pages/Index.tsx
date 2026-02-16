import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Users, Shield, Heart, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="container flex items-center justify-between py-6">
        <span className="font-display text-2xl font-semibold tracking-tight">Bonded</span>
        <div className="flex items-center gap-3">
          <Link to="/signin">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/signup">
            <Button variant="hero" size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Five connections.
            <br />
            <span className="text-accent">Infinite depth.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Bonded is a social app built on a radical idea: you can only connect with five people. 
            No endless feeds. No vanity metrics. Just the relationships that truly matter.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/signup">
              <Button variant="hero" size="lg" className="gap-2">
                Begin Your Circle
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/signin">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Values */}
      <section className="border-t bg-card">
        <div className="container py-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl"
          >
            <h2 className="font-display text-center text-2xl font-semibold md:text-3xl">
              Built for real relationships
            </h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: "Limited by Design",
                  desc: "Five connections maximum. Every bond you form is deliberate and meaningful.",
                },
                {
                  icon: Shield,
                  title: "Identity Validated",
                  desc: "Strong duplicate detection ensures every person on the platform is real and unique.",
                },
                {
                  icon: Heart,
                  title: "History Preserved",
                  desc: "Removed connections are never lost. Your relationship history is always accountable.",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="text-center"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <span className="font-display font-medium text-foreground">Bonded</span> — Quality over quantity.
        </div>
      </footer>
    </div>
  );
};

export default Index;
