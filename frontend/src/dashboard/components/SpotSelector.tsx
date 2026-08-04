import type { SpotInfoType } from "../../types/spot";
import { SpotInfo } from "../../constants/spot";

export const ALL_SPOTS: SpotInfoType[] = [...SpotInfo].sort(
  (a, b) => a.order - b.order,
);

interface SpotSelectorProps {
  value: SpotInfoType;
  onChange: (spot: SpotInfoType) => void;
}

export function SpotSelector({ value, onChange }: SpotSelectorProps) {
  return (
    <label className="field">
      <span className="field__label">Spot</span>
      <select
        value={value.order}
        onChange={(event) => {
          const order = Number(event.target.value);
          const spot = ALL_SPOTS.find((candidate) => candidate.order === order);
          if (spot) {
            onChange(spot);
          }
        }}
      >
        {ALL_SPOTS.map((spot) => (
          <option key={spot.order} value={spot.order}>
            Spot {spot.order} ({spot.x}, {spot.y})
          </option>
        ))}
      </select>
    </label>
  );
}
