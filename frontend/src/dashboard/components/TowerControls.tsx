import { useState } from "react";
import type { TowerType } from "../../types/tower";
import type { SpotInfoType } from "../../types/spot";
import { ALL_SPOTS, SpotSelector } from "./SpotSelector";

interface TowerControlsProps {
  onSpawnTower: (type: TowerType, spot: SpotInfoType) => void;
  onSellTower: (spot: SpotInfoType) => void;
  onUpgradeTower: (spot: SpotInfoType) => void;
}

export function TowerControls({
  onSpawnTower,
  onSellTower,
  onUpgradeTower,
}: TowerControlsProps) {
  const [selectedSpot, setSelectedSpot] = useState<SpotInfoType>(ALL_SPOTS[0]);

  return (
    <section className="panel">
      <h2 className="panel__title">Towers</h2>
      <SpotSelector value={selectedSpot} onChange={setSelectedSpot} />
      <div className="button-row">
        <button
          type="button"
          onClick={() => onSpawnTower("Tesla", selectedSpot)}
        >
          Spawn Tesla Tower
        </button>
        <button
          type="button"
          onClick={() => onSpawnTower("Dendro", selectedSpot)}
        >
          Spawn Dendro Tower
        </button>
        <button
          type="button"
          onClick={() => onSpawnTower("Frost", selectedSpot)}
        >
          Spawn Frost Tower
        </button>
      </div>
      <div className="button-row">
        <button type="button" onClick={() => onUpgradeTower(selectedSpot)}>
          Upgrade Tower
        </button>
        <button type="button" onClick={() => onSellTower(selectedSpot)}>
          Sell Tower
        </button>
      </div>
    </section>
  );
}
