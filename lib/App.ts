import * as cdk from "aws-cdk-lib";
import * as cdk8s from "cdk8s";
import * as cdktf from "cdktf";
import * as constructs from "constructs";

import assert from "assert";
import fs from "fs";

/**
 * CDK App factory. In case you need customization of the underlying Apps.
 * Factory is passed a `cdk.Stack`, a `cdktf.TerraformStack` or a `cdk8s.Chart`
 * respectively depending on the types of constructs you are using.
 * Make sure apps have distinct "outDir"s so synthesis results does not mix up.
 */
export interface IAppFactory {
  readonly cdk?: (stackLike: constructs.IConstruct) => cdk.App;
  readonly cdktf?: (stackLike: constructs.IConstruct) => cdktf.App;
  readonly cdk8s?: (stackLike: constructs.IConstruct) => cdk8s.App;
}

/** Options to create a unicdk App with. */
export interface IAppOptions {
  readonly appFactory?: IAppFactory;
  readonly forceClean?: boolean;
}

const isStackLike = (x: any): boolean =>
  cdk.Stack.isStack(x) ||
  cdktf.TerraformStack.isStack(x) ||
  cdk8s.Chart.isChart(x);

type AnyCdKApp = cdk.App | cdktf.App | cdk8s.App;

const reduceOne = (
  uniApp: constructs.IConstruct,
  apps: Array<AnyCdKApp>,
  factory: IAppFactory
) => {
  const query = uniApp.node.findAll(constructs.ConstructOrder.POSTORDER);
  for (const construct of query) {
    if (construct.node.scope === undefined) {
      continue;
    }
    if (isStackLike(construct)) {
      let app: AnyCdKApp | undefined;
      if (cdk.Stack.isStack(construct)) {
        app = factory.cdk?.(construct);
      }
      if (cdktf.TerraformStack.isStack(construct)) {
        app = factory.cdktf?.(construct);
      }
      if (cdk8s.Chart.isChart(construct)) {
        app = factory.cdk8s?.(construct);
      }
      assert(app !== undefined, "app is undefined");
      // detach from the old tree
      construct.node.scope.node.tryRemoveChild(construct.node.id);
      // attach to the new tree
      // @ts-expect-error
      app.node.addChild(construct, construct.node.id);
      // tree is modified, restart the query
      return apps.push(app), true;
    }
  }
  return;
};

const reduce = (uniApp: constructs.IConstruct, factory: IAppFactory) => {
  const apps: Array<AnyCdKApp> = [];
  while (reduceOne(uniApp, apps, factory)) {}
  return apps;
};

/** A unicdk App can have any other CDK or CDK8s or CDKtf stacks in it. */
export class App extends constructs.Construct {
  readonly appFactory: IAppFactory;
  readonly forceClean: boolean;
  constructor(
    scope: constructs.Construct,
    id: string,
    private readonly props: IAppOptions = {}
  ) {
    super(scope, id);
    this.forceClean = this.props.forceClean ?? false;
    const appFactory = this.props.appFactory ?? {};
    this.appFactory = {
      cdk:
        appFactory.cdk ??
        ((x) => new cdk.App({ outdir: `cdk.${x.node.id}.o` })),
      cdktf:
        appFactory.cdktf ??
        ((x) => new cdktf.App({ outdir: `cdktf.${x.node.id}.o` })),
      cdk8s:
        appFactory.cdk8s ??
        ((x) => new cdk8s.App({ outdir: `cdk8s.${x.node.id}.o` })),
    };
  }

  public synth(): void {
    const apps = reduce(this, this.appFactory);
    for (const app of apps) {
      if (this.forceClean) {
        fs.rmSync(app.outdir, { recursive: true, force: true });
      }
      app.synth();
    }
  }
}
