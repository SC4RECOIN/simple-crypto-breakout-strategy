import axios from "axios";
import moment from "moment";
import {
  AccountData,
  ActiveResponse,
  CloseAllResponse,
  OpenOrder,
  Target,
} from "./types";

const instance = axios.create({
  baseURL: process.env.REACT_APP_URL || window.location.origin,
});

export const getBuyTarget = async (): Promise<Target> => {
  const res = await instance.get<Target>("/target");
  const target = res.data;
  target.lastTime = moment(target.lastTime);
  return target;
};

export const getAccountInfo = async (): Promise<AccountData> => {
  const res = await instance.get<AccountData>("/account-info");
  return res.data;
};

export const getOpenOrders = async (): Promise<OpenOrder[]> => {
  const res = await instance.get<OpenOrder[]>("/open-orders");
  return res.data;
};

export const isActive = async (): Promise<ActiveResponse> => {
  const res = await instance.get<ActiveResponse>("/active");
  return res.data;
};

export const setIsActive = async (active: boolean): Promise<ActiveResponse> => {
  const res = await instance.post<ActiveResponse>("/active", { active });
  return res.data;
};

export const closeAll = async (): Promise<CloseAllResponse> => {
  const res = await instance.post<CloseAllResponse>("/close-all");
  return res.data;
};
