import React from "react";
import { Progress, Box, Text, HStack, Spacer } from "@chakra-ui/react";
import { getBuyTarget } from "../api/api";
import { useQuery } from "react-query";
import numeral from "numeral";
import { isMobile } from "react-device-detect";

const TargetProgress = () => {
  const query = useQuery("target", getBuyTarget);
  const t = query.data;

  const longProgress = t ? (t.last - t.open) / (t.longTarget - t.open) : 0;
  const shortProgress = t ? (t.last - t.open) / (t.shortTarget - t.open) : 0;
  const fontSize = isMobile ? "sm" : "md";

  return (
    <Box>
      <HStack mb="1rem">
        <HStack>
          <Text fontSize={fontSize}>${t?.shortTarget}</Text>
          <Text fontSize={fontSize} opacity="50%">
            ~ {numeral(shortProgress).format("(0 %)")}
          </Text>
        </HStack>
        <Spacer />
        <Text fontSize={fontSize}>${t?.open}</Text>
        <Spacer />
        <HStack>
          <Text fontSize={fontSize}>${t?.longTarget}</Text>
          <Text fontSize={fontSize} opacity="50%">
            ~ {numeral(longProgress).format("(0 %)")}
          </Text>
        </HStack>
      </HStack>
      <Progress
        w="50%"
        float="right"
        colorScheme={longProgress > 1 ? "blue" : "green"}
        size="lg"
        value={Math.max(0, longProgress * 100)}
      />
      <Progress
        w="50%"
        float="right"
        transform="rotate(180deg)"
        colorScheme={shortProgress > 1 ? "blue" : "red"}
        size="lg"
        value={Math.max(0, shortProgress * 100)}
      />
    </Box>
  );
};

export default TargetProgress;
