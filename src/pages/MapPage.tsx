import MiTurnowMap from "@/components/MiTurnowMap";

const MapPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 h-screen flex flex-col">
        <h1 className="text-2xl font-bold mb-4">Negocios cercanos</h1>
        <div className="flex-1 min-h-0">
          <MiTurnowMap className="h-full" />
        </div>
      </div>
    </div>
  );
};

export default MapPage;
