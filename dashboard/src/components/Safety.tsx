import React, { useState, useEffect } from "react";
import { Button, HStack, Tooltip, useToast } from "@chakra-ui/react";
import { isActive, setIsActive, closeAll } from "../api/api";
import { isMobile } from "react-device-detect";

const SafetySwitches = () => {
  const [active, setActive] = useState(false);
  const toast = useToast();

  useEffect(() => {
    isActive()
      .then((resp) => setActive(resp.active))
      .catch((err) =>
        toast({
          title: "An error occurred fetching active status",
          description: err.toString(),
          status: "error",
        })
      );
  }, [toast]);

  const sendActiveRequest = () => {
    setIsActive(!active)
      .then((resp) => setActive(resp.active))
      .catch((err) =>
        toast({
          title: "An error occurred",
          description: err.toString(),
          status: "error",
        })
      );
  };

  const closeAllRequest = () => {
    closeAll()
      .then((resp) =>
        toast({
          title: resp.message,
          status: "success",
        })
      )
      .catch((err) =>
        toast({
          title: "An error occurred",
          description: err.toString(),
          status: "error",
        })
      );
  };

  return (
    <HStack mb="4rem" mt={isMobile ? "2rem" : "-2rem"}>
      <Button
        size="lg"
        mr="1rem"
        float="right"
        colorScheme="blue"
        onClick={sendActiveRequest}
      >
        {active ? "Disable Trader" : "Activate Trader"}
      </Button>
      <Tooltip label="Close all open orders and positions">
        <Button size="lg" colorScheme="red" onClick={closeAllRequest}>
          Close All
        </Button>
      </Tooltip>
    </HStack>
  );
};

export default SafetySwitches;
