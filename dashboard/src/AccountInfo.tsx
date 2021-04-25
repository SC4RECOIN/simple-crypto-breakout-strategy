import React from "react";
import { SimpleGrid, Box, Text, useToast, Flex } from "@chakra-ui/react";
import { useQuery } from "react-query";
import { getAccountInfo, getOpenOrders } from "./api/api";
import { OpenOrder, Position } from "./api/types";
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

const OrderBox = (props: OpenOrder) => {
  const bg = useCardColor();
  return (
    <SimpleGrid columns={1} spacing={5} bg={bg} borderRadius="8px" p="2rem">
      <Row label="Future" value={props.future} />
      <Row label="Order Type" value={props.orderType} />
      <Row label="Side" value={props.side} />
      <Row label="Size" value={props.size} />
      <Row label="Trigger Price" value={props.triggerPrice} />
      <Row label="Reduce Only" value={props.reduceOnly.toString()} />
    </SimpleGrid>
  );
};

const AccountInfo = () => {
  const accountQuery = useQuery("account-info", getAccountInfo);
  const ordersQuery = useQuery("orders", getOpenOrders);
  const toast = useToast();

  const positions = accountQuery.data?.positions || [];
  const orders = ordersQuery.data || [];

  if (accountQuery.isError) {
    toast({
      title: "An error occurred fetching positions",
      description: (accountQuery.error as Error).message,
      status: "error",
    });
  }

  if (ordersQuery.isError) {
    toast({
      title: "An error occurred fetching orders",
      description: (ordersQuery.error as Error).message,
      status: "error",
    });
  }

  return (
    <SimpleGrid columns={2} spacing={10} mt="4rem">
      <Text fontSize="2xl">Open Orders</Text>
      <Text fontSize="2xl">Positions</Text>
      <Box>
        {orders.map((o) => (
          <OrderBox key={o.id} {...o} />
        ))}
      </Box>
      <Box>
        {positions.map((p, idx) => (
          <PositionBox key={idx} {...p} />
        ))}
      </Box>
    </SimpleGrid>
  );
};

export default AccountInfo;
