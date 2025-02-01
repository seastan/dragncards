import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useGameDefinition } from "../features/engine/hooks/useGameDefinition";
import useProfile from "./useProfile";

const preloadImages = (imageUrls) => {
  imageUrls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
};

export const usePreloadCardImages = () => {
  const user = useProfile();
  const gameDef = useGameDefinition();
  const cardById = useSelector(state => state?.gameUi?.game?.cardById);
  const imgUrls = Object.values(cardById).filter(card => card?.stackIndex === 0 || card?.stackIndex === 1).map(card => card?.sides?.A?.imageUrl);
  var urlPrefix = "";
  if (gameDef?.imageUrlPrefix?.[user?.language]) urlPrefix = gameDef?.imageUrlPrefix?.[user?.language];
  else if (gameDef?.imageUrlPrefix?.Default) urlPrefix = gameDef?.imageUrlPrefix?.Default;
  const imgUrlsWithPrefix = imgUrls.map(url => urlPrefix + url);
  
  const serializedImgUrls = JSON.stringify(imgUrlsWithPrefix.sort());

  useEffect(() => {
    preloadImages(imgUrlsWithPrefix);
  }, [serializedImgUrls]);
};