import axios from "axios";
import { AccountInfo, Target } from "./types";

const instance = axios.create({ baseURL: "http://localhost:4000" });

export const getBuyTarget = async (): Promise<Target> => {
  const res = await instance.get<Target>("/target");
  return res.data;
};

export const getAccountInfo = async (): Promise<AccountInfo> => {
  const res = await instance.get<AccountInfo>("/account-info");
  return res.data;
};
