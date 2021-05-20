import * as React from "react";
import ReactDOM from "react-dom";
import { ColorModeScript, ChakraProvider, Box, theme } from "@chakra-ui/react";
import { ColorModeSwitcher } from "./components/ColorModeSwitcher";
import TargetProgress from "./components/Progress";
import { QueryClient, QueryClientProvider } from "react-query";
import Positions from "./components/Positions";
import { isMobile } from "react-device-detect";
import Stats from "./components/Stats";
import SafetySwitches from "./components/Safety";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

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
          <SafetySwitches />
          <Stats />
          <TargetProgress />
          <Positions />
        </Box>
      </ChakraProvider>
    </QueryClientProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

serviceWorkerRegistration.register();
