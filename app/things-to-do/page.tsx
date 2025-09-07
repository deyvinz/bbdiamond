import Section from "@/components/Section";
import Card from "@/components/Card";
import { supabaseServer } from "@/lib/supabase-server";
import { MapPin, Link, Utensils, Camera, Music, ShoppingBag, Plane, Car, Hotel, Mountain, Waves, TreePine, Coffee, Wine, Gamepad2, BookOpen, Heart, Star } from "lucide-react";
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

  const getActivityIcon = (title: string, description: string) => {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('restaurant') || text.includes('food') || text.includes('dining') || text.includes('eat') || text.includes('cuisine')) {
      return <Utensils className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('photo') || text.includes('gallery') || text.includes('museum') || text.includes('art') || text.includes('exhibition')) {
      return <Camera className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('music') || text.includes('concert') || text.includes('live') || text.includes('entertainment') || text.includes('nightlife')) {
      return <Music className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('shopping') || text.includes('market') || text.includes('mall') || text.includes('store') || text.includes('boutique')) {
      return <ShoppingBag className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('airport') || text.includes('flight') || text.includes('travel') || text.includes('transport')) {
      return <Plane className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('car') || text.includes('drive') || text.includes('rental') || text.includes('taxi') || text.includes('uber')) {
      return <Car className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('hotel') || text.includes('accommodation') || text.includes('stay') || text.includes('lodge') || text.includes('resort')) {
      return <Hotel className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('mountain') || text.includes('hiking') || text.includes('trail') || text.includes('peak') || text.includes('hill')) {
      return <Mountain className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('beach') || text.includes('ocean') || text.includes('sea') || text.includes('water') || text.includes('swim')) {
      return <Waves className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('park') || text.includes('garden') || text.includes('nature') || text.includes('forest') || text.includes('green')) {
      return <TreePine className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('coffee') || text.includes('cafe') || text.includes('brew') || text.includes('drink')) {
      return <Coffee className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('wine') || text.includes('bar') || text.includes('cocktail') || text.includes('drink') || text.includes('alcohol')) {
      return <Wine className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('game') || text.includes('arcade') || text.includes('fun') || text.includes('entertainment') || text.includes('play')) {
      return <Gamepad2 className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('library') || text.includes('book') || text.includes('read') || text.includes('study') || text.includes('education')) {
      return <BookOpen className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('romantic') || text.includes('couple') || text.includes('date') || text.includes('love') || text.includes('wedding')) {
      return <Heart className="h-6 w-6 text-gold-600" />
    }
    if (text.includes('attraction') || text.includes('landmark') || text.includes('famous') || text.includes('popular') || text.includes('must-see')) {
      return <Star className="h-6 w-6 text-gold-600" />
    }
    
    // Default icon for other activities
    return <MapPin className="h-6 w-6 text-gold-600" />
  };

  return (
    <Section title="Things to do" subtitle="Make a weekend of it">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {items.map((i) => (
          <Card key={i.title} className="group hover:shadow-xl transition-all duration-200">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(i.title, i.description)}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg group-hover:text-gold-700 transition-colors duration-200">
                    {i.title}
                  </h3>
                  <p className="text-sm text-black/70 mt-1 leading-relaxed">
                    {i.description}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <a 
                  href={i.map_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="transition-all duration-200 hover:scale-105"
                >
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs">Map</span>
                  </Button>
                </a>
                <a 
                  href={i.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="transition-all duration-200 hover:scale-105"
                >
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    <span className="text-xs">Visit</span>
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
