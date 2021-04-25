import React from "react";
import {
  Progress,
  Box,
  Text,
  HStack,
  useToast,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
} from "@chakra-ui/react";
import { getBuyTarget } from "./api/api";
import { useQuery } from "react-query";
import numeral from "numeral";

const TargetProgress = () => {
  const query = useQuery("target", getBuyTarget);
  const toast = useToast();
  const t = query.data;

  if (query.isError) {
    toast({
      title: "An error occurred fetching the buy target",
      description: (query.error as Error).message,
      status: "error",
    });
  }

  let progress = 0;
  if (t) {
    const diff = t.target - t.open;
    const current = t.last - t.open;
    progress = current / diff;
  }

  return (
    <Box w="100%">
      <Stat mb="3rem">
        <StatLabel>Current Price</StatLabel>
        <StatNumber>${numeral(t?.last).format("0.00")}</StatNumber>
        <StatHelpText>
          Target - ${numeral(t?.target).format("0.00")}
        </StatHelpText>
      </Stat>
      <HStack mb="1rem">
        <Text>Distance to Target</Text>
        <Text opacity="50%">- {numeral(progress).format("0 %")}</Text>
      </HStack>
      <Progress
        colorScheme={progress > 1 ? "green" : "blue"}
        size="lg"
        value={progress * 100}
      />
    </Box>
  );
};

export default TargetProgress;
