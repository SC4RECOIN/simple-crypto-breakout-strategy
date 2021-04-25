import * as React from "react";
import { ChakraProvider, Box, theme } from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";
import TargetProgress from "./Progress";
import { QueryClient, QueryClientProvider } from "react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 5000,
    },
  },
});

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <ChakraProvider theme={theme}>
      <ColorModeSwitcher />
      <Box p="4rem">
        <TargetProgress />
      </Box>
    </ChakraProvider>
  </QueryClientProvider>
);
