import { useState } from "react";
import { Package } from "lucide-react";

import { assetUrl } from "../services/api";

// Miniatura da peça: usa a imagem cadastrada (imageUrl) ou, se não houver
// (ou se falhar ao carregar), um ícone. Usada na página do projeto e na pública.
export default function PartThumb({ part }) {
  const [failed, setFailed] = useState(false);
  const src = part?.imageUrl ? assetUrl(part.imageUrl) : "";

  return (
    <div className="part-thumb">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <Package size={22} />
      )}
    </div>
  );
}
