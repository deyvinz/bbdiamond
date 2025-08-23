import Section from "@/components/Section";
import Card from "@/components/Card";
import { supabaseServer } from "@/lib/supabase-server";
import { MapPin, Link } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function Page() {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("things_to_do")
    .select("title, description, map_url, website")
    .order("sort_order", { ascending: true });
  const items: {
    title: string;
    description: string;
    map_url: string;
    website: string;
  }[] = data ?? [];

  return (
    <Section title="Things to do" subtitle="Make a weekend of it">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {items.map((i) => (
          <Card key={i.title}>
            <div className="flex flex-row gap-2 items-center justify-between">
              <div className="flex flex-col gap-2">
                <h3 className="font-medium">{i.title}</h3>
                <p className="text-sm text-black/70">{i.description}</p>
              </div>
              <div className="flex flex-col gap-3 md:justify-start justify-center">
                <a href={i.map_url}>
                  <Button variant="outline" size="sm">
                    <MapPin className="w-4 h-4" />
                  </Button>
                </a>
                <a href={i.website}>
                  <Button variant="outline" size="sm">
                    <Link className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}
