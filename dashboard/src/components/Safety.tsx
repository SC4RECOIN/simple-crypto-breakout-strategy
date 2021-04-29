import React, { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  HStack,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { isActive, setIsActive, closeAll } from "../api/api";
import { isMobile } from "react-device-detect";

const SafetySwitches = () => {
  const [active, setActive] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelRef = React.useRef(null);
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
    setConfirmOpen(false);
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
    <>
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
          <Button
            size="lg"
            colorScheme="red"
            onClick={() => setConfirmOpen(true)}
          >
            Close All
          </Button>
        </Tooltip>
      </HStack>
      <AlertDialog
        isOpen={confirmOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setConfirmOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Close All
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure? This will close all positions and orders
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={closeAllRequest} ml={3}>
                Close All Positions
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default SafetySwitches;
