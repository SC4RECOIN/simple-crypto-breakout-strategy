import * as React from "react";
import ReactDOM from "react-dom";
import { ColorModeScript, ChakraProvider, Box, theme } from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";
import TargetProgress from "./Progress";
import { QueryClient, QueryClientProvider } from "react-query";
import Positions from "./Positions";
import Stats from "./Stats";
import { isMobile } from "react-device-detect";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 5000,
    },
  },
});

ReactDOM.render(
  <React.StrictMode>
    <ColorModeScript />
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <ColorModeSwitcher />
        <Box p={isMobile ? "2rem" : "6rem"}>
          <Stats />
          <TargetProgress />
          <Positions />
        </Box>
      </ChakraProvider>
    </QueryClientProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
