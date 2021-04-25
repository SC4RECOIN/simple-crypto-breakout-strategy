import React from "react";
import { SimpleGrid, Box, Text, useToast, Flex } from "@chakra-ui/react";
import { useQuery } from "react-query";
import { getAccountInfo } from "./api/api";
import { Position } from "./api/types";
import { useCardColor } from "./ColorModeSwitcher";

const Row = (props: { label: string; value: string | number }) => (
  <Flex>
    <Text flex="1" fontWeight="bold">
      {props.label}
    </Text>
    <Text flex="2">{props.value}</Text>
  </Flex>
);

const PositionBox = (props: Position) => {
  const bg = useCardColor();
  return (
    <SimpleGrid columns={1} spacing={5} bg={bg} borderRadius="8px" p="2rem">
      <Row label="Future" value={props.future} />
      <Row label="Entry Price" value={props.entryPrice} />
      <Row label="Liquidation Price" value={props.etimatedLiquidationPrice} />
      <Row label="Size" value={props.size} />
      <Row label="Entry Price" value={props.entryPrice} />
      <Row label="Return" value={props.unrealizedPnl} />
    </SimpleGrid>
  );
};

const AccountInfo = () => {
  const query = useQuery("account-info", getAccountInfo);
  const toast = useToast();

  const pos: Position = {
    future: "ETH-PERP",
    side: "buy",
    entryPrice: 2535.45,
    etimatedLiquidationPrice: 1634.45,
    size: 0.67789,
    cost: 900.45,
    unrealizedPnl: 200.41,
    realizedPnl: 0,
  };
  // const positions = query.data?.positions || [];
  const positions = [pos];

  if (query.isError) {
    toast({
      title: "An error occurred fetching positions",
      description: (query.error as Error).message,
      status: "error",
    });
  }

  return (
    <SimpleGrid columns={2} spacing={10} mt="4rem">
      <Text fontSize="2xl">Open Orders</Text>
      <Text fontSize="2xl">Positions</Text>
      <Box></Box>
      <Box>
        {positions.map((p, idx) => (
          <PositionBox key={idx} {...p} />
        ))}
      </Box>
      <Box></Box>
    </SimpleGrid>
  );
};

export default AccountInfo;
