import React from "react";
import { Progress, Box, Text, HStack } from "@chakra-ui/react";
import { getBuyTarget } from "./api/api";
import { useQuery } from "react-query";
import numeral from "numeral";

const TargetProgress = () => {
  const query = useQuery("target", getBuyTarget);
  const t = query.data;

  let progress = 0;
  if (t) {
    const diff = t.target - t.open;
    const current = t.last - t.open;
    progress = current / diff;
  }

  return (
    <Box>
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
