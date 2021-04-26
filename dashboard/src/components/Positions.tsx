import React from "react";
import { SimpleGrid, Box, Text, useToast, Flex } from "@chakra-ui/react";
import { useQuery } from "react-query";
import { getAccountInfo, getOpenOrders } from "../api/api";
import { AccountData, OpenOrder, Position } from "../api/types";
import { useCardColor } from "./ColorModeSwitcher";
import { isMobile } from "react-device-detect";
import numeral from "numeral";

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
  const fmt = (value: number) => numeral(value).format("$0.00");
  return (
    <SimpleGrid columns={1} spacing={5} bg={bg} borderRadius="8px" p="2rem">
      <Row label="Future" value={props.future} />
      <Row label="Side" value={props.side} />
      <Row
        label="Liquidation Price"
        value={fmt(props.estimatedLiquidationPrice)}
      />
      <Row label="Size" value={props.size} />
      <Row
        label="Return"
        value={fmt(props.unrealizedPnl + props.realizedPnl)}
      />
    </SimpleGrid>
  );
};

const OrderBox = (props: OpenOrder) => {
  const bg = useCardColor();
  return (
    <SimpleGrid columns={1} spacing={5} bg={bg} borderRadius="8px" p="2rem">
      <Row label="Future" value={props.future} />
      <Row label="Side" value={props.side} />
      <Row label="Size" value={props.size} />
      <Row
        label="Trigger Price"
        value={numeral(props.triggerPrice).format("$0.00")}
      />
      <Row label="Reduce Only" value={props.reduceOnly.toString()} />
    </SimpleGrid>
  );
};

const EmptyBox = (props: { msg: string }) => {
  const bg = useCardColor();
  return (
    <Box bg={bg} borderRadius="8px" p="2rem">
      <Text opacity="50%">{props.msg}</Text>
    </Box>
  );
};

const Positions = () => {
  const accountQuery = useQuery("account-info", getAccountInfo);
  const ordersQuery = useQuery("orders", getOpenOrders);
  const act = accountQuery.data || ({} as AccountData);
  const toast = useToast();

  const positions = act.positions || [];
  const orders = ordersQuery.data || [];

  if (ordersQuery.isError) {
    toast({
      title: "An error occurred fetching orders",
      description: (ordersQuery.error as Error).message,
      status: "error",
    });
  }

  return (
    <SimpleGrid columns={isMobile ? 1 : 2} spacing={10} mt="3rem">
      <Box>
        <Text fontSize="2xl" m="1rem">
          Open Orders
        </Text>
        {!orders.length && <EmptyBox msg="No open orders" />}
        {orders.map((o) => (
          <OrderBox key={o.id} {...o} />
        ))}
      </Box>
      <Box>
        <Text fontSize="2xl" m="1rem">
          Positions
        </Text>
        {!positions.length && <EmptyBox msg="No positions" />}
        {positions.map((p, idx) => (
          <PositionBox key={idx} {...p} />
        ))}
      </Box>
    </SimpleGrid>
  );
};

export default Positions;
