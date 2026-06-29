import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Sparkles,
  Heart,
  Film,
  Star,
  Sun,
  Moon,
  TreePine,
  Mountain,
  Flame,
  Gift,
  Tag,
  Check,
  ZoomIn,
  X,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { campings } from "@/lib/data";
import { cn } from "@/lib/utils";

type DynamicPlan = {
  id: string;
  nombre: string;
  eslogan: string;
  descripcion: string;
  tipo: "normal" | "temporada" | "preventa" | "addon" | "pasa_dia";
  icono: string;
  color: string;
  estado: boolean;
  preventa: boolean;
  fechaInicio: string | null;
  fechaFin: string | null;
  precios: Record<string, number>;
  precio: number;
  campingIds: number[] | null;
  incluye: string[];
  imagenUrl?: string | null;
  botonColor?: string | null;
  mostrarImagen?: boolean;
};

const iconMap: Record<string, LucideIcon> = {
  Sparkles, Heart, Film, Star, Sun, Moon, TreePine, Mountain, Flame, Gift, Tag
};
const getIconComponent = (id: string): LucideIcon => iconMap[id] || Sparkles;

export default function PlansPage() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const campingIdParam = searchParams.get("campingId");
  const campingId = campingIdParam ? parseInt(campingIdParam) : null;

  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const selectedCamping = campingId ? campings.find(c => c.id === campingId) : null;

  useEffect(() => {
    setLoading(true);
    fetch("/api/plans/active")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(err => console.error("Error fetching plans:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredPlans = useMemo(() => {
    if (!campingId) return plans;
    return plans.filter(p => p.campingIds && p.campingIds.includes(campingId));
  }, [plans, campingId]);

  const handleReservar = (plan: DynamicPlan) => {
    setLocation(`/reservar?planId=${plan.id}&campingId=${campingId ?? (plan.campingIds?.[0] ?? "")}`);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] py-8 md:py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-stone-400 hover:text-accent mb-8 transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium uppercase tracking-widest">Regresar</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          {selectedCamping && (
            <span className="text-accent uppercase tracking-widest text-sm font-bold block mb-3">
              {selectedCamping.name}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl font-serif text-primary mb-4">
            {selectedCamping ? `Planes para ${selectedCamping.name}` : "Todos los Planes"}
          </h1>
          <p className="text-stone-500 max-w-xl mx-auto">
            {selectedCamping
              ? `Elige el plan perfecto para tu estancia en ${selectedCamping.name} y vive una experiencia única en la naturaleza.`
              : "Encuentra el plan que mejor se adapta a lo que estás buscando."}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPlans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-[2.5rem] border border-stone-100"
          >
            <Sparkles className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-serif text-stone-500 mb-2">Sin planes disponibles</h3>
            <p className="text-stone-400 text-sm">Por el momento no hay planes activos para este domo.</p>
            <Button
              variant="outline"
              className="mt-6 rounded-2xl border-accent text-accent hover:bg-accent hover:text-white"
              onClick={() => setLocation("/")}
            >
              Ver todos los domos
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredPlans.map((plan, index) => {
              const IconComp = getIconComponent(plan.icono);
              const isExpanded = expandedPlanId === plan.id;
              const isPasaDia = plan.tipo === "pasa_dia";
              const showImage = plan.mostrarImagen && plan.imagenUrl;
              const btnColor = plan.botonColor || plan.color || "#2D5A40";

              if (showImage) {
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden group"
                  >
                    <div
                      className="relative cursor-pointer overflow-hidden"
                      onClick={() => setLightboxUrl(plan.imagenUrl!)}
                    >
                      <img
                        src={plan.imagenUrl!}
                        alt={plan.nombre}
                        className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        style={{ maxHeight: "500px" }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-12 h-12 text-white opacity-0 group-hover:opacity-90 transition-opacity drop-shadow-lg" />
                      </div>
                      {plan.preventa && (
                        <div className="absolute top-3 left-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                          PREVENTA
                        </div>
                      )}
                      {isPasaDia && (
                        <div className="absolute top-3 right-3 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                          PASA DÍA
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <Button
                        className="w-full h-12 rounded-2xl font-bold uppercase tracking-widest text-sm text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: btnColor }}
                        onClick={() => handleReservar(plan)}
                      >
                        Reservar este Plan
                      </Button>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden"
                >
                  <div
                    className="p-6 cursor-pointer"
                    onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${plan.color}20` }}
                      >
                        <IconComp className="w-6 h-6" style={{ color: plan.color }} />
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-xl font-serif text-primary">{plan.nombre}</h3>
                          {plan.preventa && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[9px] uppercase tracking-widest font-bold">
                              Preventa
                            </Badge>
                          )}
                          {isPasaDia && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-[9px] uppercase tracking-widest font-bold">
                              Pasa Día
                            </Badge>
                          )}
                          {plan.tipo === "temporada" && (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[9px] uppercase tracking-widest font-bold">
                              Temporada
                            </Badge>
                          )}
                        </div>
                        <p className="text-stone-500 text-sm">{plan.eslogan}</p>
                        {plan.descripcion && (
                          <p className="text-stone-400 text-xs mt-1 leading-relaxed">{plan.descripcion}</p>
                        )}
                      </div>

                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 space-y-5 border-t border-stone-50 pt-5">
                          {plan.incluye && plan.incluye.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-3">
                                Este plan incluye:
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {plan.incluye.map((feature, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm text-stone-600">
                                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                      style={{ backgroundColor: `${plan.color}20` }}>
                                      <Check className="w-2.5 h-2.5" style={{ color: plan.color }} />
                                    </div>
                                    {feature}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <Button
                            className="w-full h-12 rounded-2xl font-bold uppercase tracking-widest text-sm text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: btnColor }}
                            onClick={() => handleReservar(plan)}
                          >
                            Reservar este Plan
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isExpanded && (
                    <div className="px-6 pb-5 flex items-center justify-between">
                      <button
                        className="text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-accent transition-colors"
                        onClick={() => setExpandedPlanId(plan.id)}
                      >
                        Ver detalles →
                      </button>
                      <Button
                        size="sm"
                        className="rounded-xl font-bold uppercase tracking-widest text-xs text-white h-9 px-5"
                        style={{ backgroundColor: btnColor }}
                        onClick={() => handleReservar(plan)}
                      >
                        Reservar
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {!loading && filteredPlans.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-12 p-8 bg-white rounded-[2.5rem] border border-stone-100"
          >
            <p className="text-stone-500 text-sm mb-4">
              ¿Tienes dudas sobre qué plan elegir? Escríbenos por WhatsApp y te ayudamos.
            </p>
            <a
              href="https://wa.me/573103272630"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-2xl transition-colors"
            >
              Contactar por WhatsApp
            </a>
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl bg-black border-none shadow-2xl">
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-3 right-3 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Plan"
              className="w-full max-h-[85vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
