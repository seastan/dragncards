import { siteL10n } from "../features/definitions/localization";
import useProfile from "./useProfile";

export const useSiteL10n = () => {
    const user = useProfile();
    const language = user?.language || "English";
    return (label) => {
        if (!label) return "";
        else if (typeof label !== "string") return "";
        else return siteL10n?.[label]?.[language] || siteL10n?.[label]?.English || label;
    }
}