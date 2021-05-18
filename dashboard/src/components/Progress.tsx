import React from "react";
import { Progress, Box, Text, HStack, Spacer, Tag } from "@chakra-ui/react";
import { getBuyTarget } from "../api/api";
import { useQuery } from "react-query";
import numeral from "numeral";
import { isMobile } from "react-device-detect";

const ConfigTag = (props: { children: string }) => {
  return (
    <Tag variant="subtle" colorScheme="cyan" size="lg" mr="10px">
      {props.children}
    </Tag>
  );
};

const TargetProgress = () => {
  const query = useQuery("target", getBuyTarget);
  const t = query.data;

  const longProgress = t ? (t.last - t.open) / (t.longTarget - t.open) : 0;
  const shortProgress = t ? (t.last - t.open) / (t.shortTarget - t.open) : 0;
  const fontSize = isMobile ? "sm" : "md";

  const longOnly = t?.canLong && !t?.canShort;
  const shortOnly = t?.canShort && !t?.canLong;

  return (
    <Box>
      <Box mb="2rem">
        {longOnly && <ConfigTag>Long Only</ConfigTag>}
        {shortOnly && <ConfigTag>Short Only</ConfigTag>}
      </Box>
      <HStack mb="1rem">
        <HStack>
          <Text fontSize={fontSize}>
            {numeral(t?.shortTarget).format("$0.00")}
          </Text>
          <Text fontSize={fontSize} opacity="50%">
            ~ {numeral(shortProgress).format("(0 %)")}
          </Text>
        </HStack>
        <Spacer />
        <Text fontSize={fontSize}>{numeral(t?.open).format("$0.00")}</Text>
        <Spacer />
        <HStack>
          <Text fontSize={fontSize}>
            {numeral(t?.longTarget).format("$0.00")}
          </Text>
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
