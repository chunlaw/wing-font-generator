import { useEffect, useMemo, useState } from "react";
import { TEMPLATES } from "./const";

export const useTemplateRotation = (msg: string | null) => {
  const [templateIdx, setTemplateIdx] = useState<number>(
    Math.floor(Math.random() * TEMPLATES.length),
  );
  const msgShown = useMemo(() => {
    return msg || TEMPLATES[templateIdx];
  }, [msg, templateIdx]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTemplateIdx(Math.floor(Math.random() * TEMPLATES.length));
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return msgShown;
};
