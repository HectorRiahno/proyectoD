// Barrel de componentes UI compartidos.
// Imports recomendados:
//   import { Modal, Input, Textarea, Section, EstadoBadge } from '../../../shared/components/ui';

export { Modal }                                    from './Modal';
export { PageHeader, KPI }                          from './PageHeader';
export { Input, Textarea, Select, Checkbox }       from './FormField';
export { Section }                                  from './Section';
export { Campo, CampoReadOnly }                     from './Campo';
export { EstadoBadge, estadoLabel, estadoCls }      from './EstadoBadge';
export { ErrorBox, ErrorBanner, SuccessBanner }     from './Feedback';
export { BotonesForm }                              from './BotonesForm';
export { SearchBar }                                from './SearchBar';
export { LoadingRow, EmptyRow, EmptyState, LoadingState } from './States';

// Adjuntos a consultas (PDFs / imágenes)
export { FileUpload, FileUploadCompact } from './FileUpload';
export { AdjuntoList, AdjuntoListPorConsulta } from './AdjuntoList';
export { AdjuntoViewer } from './AdjuntoViewer';

// Reportes
export { KpiCardPro } from './KpiCardPro';
export { FiltroPeriodo } from './FiltroPeriodo';
export { ExportButton } from './ExportButton';
export { FiltroFechas, rangoUltimos7, rangoUltimos30, rangoUltimos90 } from './FiltroFechas';
