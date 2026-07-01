import { LIFE_AREAS } from '../lifeDesign';

export default function AreaPlaceholder({ areaId }) {
  const area = LIFE_AREAS.find((a) => a.id === areaId);

  if (!area) return null;

  return (
    <section className="area-placeholder">
      <div className="area-placeholder__icon" style={{ color: area.color }}>
        {area.label[0]}
      </div>
      <h2>{area.label}</h2>
      <p>{area.description}</p>
      <p className="area-placeholder__soon">
        Tools for this area are coming next. For now, track how full this gauge feels on the Overview.
      </p>
    </section>
  );
}
