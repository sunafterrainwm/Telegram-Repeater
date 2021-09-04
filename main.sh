#!/bin/bash
while true;
do
	ts-node -r tsconfig-paths/register ./src/index.ts;
done