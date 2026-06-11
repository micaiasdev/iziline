import { useState } from "react";
import "./App.css";
import { NewTripPage } from "./travel/pages/NewTripPage/NewTripPage";
import { TripPointsPage } from "./travel/pages/TripPointsPage/TripPointsPage";
import type { NewTripFormData } from "./types/trip";

function App() {
  const [tripData, setTripData] = useState<NewTripFormData | null>(null);

  if (tripData) {
    return (
      <TripPointsPage
        tripData={tripData}
        onBack={() => setTripData(null)}
      />
    );
  }

  return <NewTripPage onContinue={setTripData} />;
}

export default App;