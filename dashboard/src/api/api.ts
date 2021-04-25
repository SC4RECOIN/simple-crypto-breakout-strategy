import axios from "axios";
import { AccountData, ActiveResponse, OpenOrder, Target } from "./types";

const instance = axios.create({ baseURL: "http://localhost:4000" });

export const getBuyTarget = async (): Promise<Target> => {
  const res = await instance.get<Target>("/target");
  return res.data;
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
