import * as React from "react";
import { useColorMode, useColorModeValue, IconButton } from "@chakra-ui/react";
import { FaMoon, FaSun } from "react-icons/fa";

export const ColorModeSwitcher = () => {
  const { toggleColorMode } = useColorMode();
  const SwitchIcon = useColorModeValue(FaMoon, FaSun);

  return (
    <IconButton
      fontSize="lg"
      variant="ghost"
      onClick={toggleColorMode}
      icon={<SwitchIcon />}
      aria-label="color-mode"
      position="absolute"
      right="10px"
      top="10px"
    />
  );
};

export const useCardColor = () => {
  return useColorModeValue("rgba(0, 0, 0, 0.05)", "rgba(255, 255, 255, 0.05)");
};
