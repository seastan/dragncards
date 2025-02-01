import React from "react";
import { RouteComponentProps } from "react-router-dom";
import Room from "../features/engine/Room";
import {MessagesProvider} from '../contexts/MessagesContext';

type TParams = { slug: string };
interface Props extends RouteComponentProps<TParams> {}

export const RoomShow: React.FC<Props> = ({ match }) => {
  console.log('Rendering RoomShow')
  const {
    params: { slug },
  } = match;
  return(
    <MessagesProvider value={[]}>
      <Room slug={slug} />
    </MessagesProvider>
  )
};
export default RoomShow;
