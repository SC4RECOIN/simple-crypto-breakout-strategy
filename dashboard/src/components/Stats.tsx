import React from "react";
import {
  Stat,
  SimpleGrid,
  StatLabel,
  StatNumber,
  useToast,
  StatHelpText,
} from "@chakra-ui/react";
import numeral from "numeral";
import { getAccountInfo, getBuyTarget } from "../api/api";
import { AccountData } from "../api/types";
import { useQuery } from "react-query";
import { isMobile } from "react-device-detect";

const Stats = () => {
  const accountQuery = useQuery("account-info", getAccountInfo);
  const targetQuery = useQuery("target", getBuyTarget);
  const act = accountQuery.data || ({} as AccountData);
  const t = targetQuery.data;
  const toast = useToast();

  if (accountQuery.isError) {
    toast({
      title: "An error occurred fetching account data",
      description: (accountQuery.error as Error).message,
      status: "error",
    });
  }

  if (targetQuery.isError) {
    toast({
      title: "An error occurred fetching the buy target",
      description: (targetQuery.error as Error).message,
      status: "error",
    });
  }

  let chg = 0;
  if (t) chg = t.last / t.open - 1;

  // assuming only 1 position
  let posReturn = 0;
  let statColumns = 4;
  if (act.positions?.length) {
    const pos = act.positions[0];
    const actVal = act.totalAccountValue;
    posReturn = actVal / (actVal - pos.realizedPnl) - 1;
    statColumns = 5;
  }

  return (
    <SimpleGrid columns={isMobile ? 2 : statColumns} spacing={6} mb="3rem">
      <Stat>
        <StatLabel>Current Price</StatLabel>
        <StatNumber fontSize="3xl">
          ${numeral(t?.last).format("0.00")}
        </StatNumber>
        <StatHelpText>
          Target - ${numeral(t?.target).format("0.00")}
        </StatHelpText>
      </Stat>
      <Stat>
        <StatLabel>Today</StatLabel>
        <StatNumber fontSize="3xl">{numeral(chg).format("+0.00 %")}</StatNumber>
        <StatHelpText>{t?.ticker}</StatHelpText>
      </Stat>
      <Stat>
        <StatLabel>Account Value</StatLabel>
        <StatNumber fontSize="3xl">
          {numeral(act.totalAccountValue).format("$0,00")}
        </StatNumber>
      </Stat>
      <Stat>
        <StatLabel>Total Position Size</StatLabel>
        <StatNumber fontSize="3xl">
          {numeral(act.totalPositionSize).format("$0,00")}
        </StatNumber>
      </Stat>
      {act.positions?.length > 0 && (
        <Stat>
          <StatLabel>Position Return</StatLabel>
          <StatNumber fontSize="3xl">
            {numeral(posReturn).format("+0.00 %")}
          </StatNumber>
        </Stat>
      )}
    </SimpleGrid>
  );
};

export default Stats;
