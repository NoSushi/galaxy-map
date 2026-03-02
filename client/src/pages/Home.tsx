import { GalaxyMap } from "@/components/GalaxyMap";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { MapProvider } from "@/lib/MapProvider";

export default function Home() {
  return (
    <MapProvider>
      <div className="w-screen h-screen overflow-hidden bg-background relative flex flex-col font-sans text-foreground">
        <TopBar />
        <div className="flex-1 relative w-full h-full pt-16">
          <GalaxyMap />
          <Sidebar />
        </div>
      </div>
    </MapProvider>
  );
}
