import * as React from "react";
import ReactDOM from "react-dom";
import { ColorModeScript, ChakraProvider, Box, theme } from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";
import TargetProgress from "./Progress";
import { QueryClient, QueryClientProvider } from "react-query";
import AccountInfo from "./AccountInfo";
import Stats from "./Stats";

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
        <Box p="6rem">
          <Stats />
          <TargetProgress />
          <AccountInfo />
        </Box>
      </ChakraProvider>
    </QueryClientProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
