import { createRouter, createWebHistory } from "vue-router";
import BaseMutation from "./views/BaseMutation.vue";
import BaseQuery from "./views/BaseQuery.vue";
import Home from "./views/Home.vue";
import InfiniteQuery from "./views/InfiniteQuery.vue";
import RpcMutation from "./views/RpcMutation.vue";
import RpcQuery from "./views/RpcQuery.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { component: Home, path: "/" },
    { component: BaseQuery, path: "/examples/base/base-query" },
    { component: BaseMutation, path: "/examples/base/base-mutation" },
    { component: InfiniteQuery, path: "/examples/infinite/infinite-query" },
    { component: RpcQuery, path: "/examples/rpc/rpc-query" },
    { component: RpcMutation, path: "/examples/rpc/rpc-mutation" },
  ],
});
