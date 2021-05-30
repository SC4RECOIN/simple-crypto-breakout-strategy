import React from "react";
import {
  Stat,
  SimpleGrid,
  StatLabel,
  StatNumber,
  useToast,
  Alert,
  AlertIcon,
  Text,
} from "@chakra-ui/react";
import numeral from "numeral";
import { getAccountInfo, getBuyTarget } from "../api/api";
import { AccountData } from "../api/types";
import { useQuery } from "react-query";
import { isMobile } from "react-device-detect";
import moment from "moment";

const Stats = () => {
  const accountQuery = useQuery("account-info", getAccountInfo, {
    refetchInterval: 60000,
  });
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

  let posReturn;
  if (act.positions?.length) {
    const sum = act.fills.reduce((a, b) => a + b.price, 0);
    const avgPrice = sum / act.fills.length;
    posReturn = (t?.last || avgPrice) / avgPrice - 1;
  }

  const statColumns = posReturn ? 5 : 4;

  return (
    <>
      {moment().diff(t?.lastTime, "minutes") > 1 && (
        <Alert status="warning" mb="1rem">
          <AlertIcon />
          Price data may be outdated
          <Text ml="5px" opacity="70%">
            - last updated {t?.lastTime.format("LTS")}
          </Text>
        </Alert>
      )}
      <SimpleGrid columns={isMobile ? 2 : statColumns} spacing={6} mb="3rem">
        <Stat>
          <StatLabel>Current Price</StatLabel>
          <StatNumber fontSize="3xl">
            ${numeral(t?.last).format("0.00")}
          </StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Today</StatLabel>
          <StatNumber fontSize="3xl">
            {numeral(chg).format("+0.00 %")}
          </StatNumber>
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
    </>
  );
};

export default Stats;
