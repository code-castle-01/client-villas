import { useContext } from "react";
import { AdaptiveUIContext } from "./context";

export const useAdaptiveUI = () => useContext(AdaptiveUIContext);
