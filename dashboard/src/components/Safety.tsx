import React, { useState, useEffect } from "react";
import { Button, HStack, Tooltip, useToast } from "@chakra-ui/react";
import { isActive } from "../api/api";

const SafetySwitches = () => {
  const [active, setIsActive] = useState(false);
  const toast = useToast();

  useEffect(() => {
    isActive()
      .then((resp) => setIsActive(resp.active))
      .catch((err) =>
        toast({
          title: "An error occurred fetching active status",
          description: err.toString(),
          status: "error",
        })
      );
  }, [toast]);

  return (
    <HStack mb="4rem" mt="-2rem">
      <Button size="lg" mr="1rem" float="right" colorScheme="blue">
        {active ? "Disable Trader" : "Activate Trader"}
      </Button>
      <Tooltip label="Close all open orders and positions">
        <Button size="lg" colorScheme="red">
          Close All
        </Button>
      </Tooltip>
    </HStack>
  );
};

export default SafetySwitches;
