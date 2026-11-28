import { useEffect, useState } from 'react';
import { citaService } from '../services';

// Enlace de teleconsulta y WhatsApp de una lista de citas, como mapa
// { id_cita: { enlace_teleconsulta, whatsapp_telefono, ... } }.
// Las vistas de citas no traen estas columnas (migration-teleconsulta-whatsapp.sql),
// así que se piden aparte a la tabla `cita` (respeta el RLS de cada rol).
export function useDatosTeleconsulta(citas) {
  const [datos, setDatos] = useState({});
  const clave = (citas ?? []).map(c => c.id_cita).join(',');

  useEffect(() => {
    if (!clave) { setDatos({}); return; }
    let vigente = true;
    citaService.getDatosTeleconsulta(clave.split(',').map(Number))
      .then(d => { if (vigente) setDatos(d); });
    return () => { vigente = false; };
  }, [clave]);

  return datos;
}
