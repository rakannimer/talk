import { Localized } from "fluent-react/compat";
import React, { FunctionComponent, useCallback, useState } from "react";

import { ExternalLink } from "coral-framework/lib/i18n/components";
import { graphql, withFragmentContainer } from "coral-framework/lib/relay";
import {
  Button,
  ButtonIcon,
  FormFieldDescription,
  HorizontalGutter,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "coral-ui/components/v2";

import { WebhookEndpointsConfigContainer_settings } from "coral-admin/__generated__/WebhookEndpointsConfigContainer_settings.graphql";

import ConfigBox from "../../ConfigBox";
import Header from "../../Header";
import Subheader from "../../Subheader";
import ConfigureWebhookEndpointModal from "./ConfigureWebhookEndpointModal";
import WebhookEndpointRow from "./WebhookEndpointRow";

interface Props {
  settings: WebhookEndpointsConfigContainer_settings;
}

const WebhookEndpointsConfigContainer: FunctionComponent<Props> = ({
  settings,
}) => {
  const [open, setOpen] = useState(false);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  return (
    <HorizontalGutter size="double">
      <ConfigBox
        title={
          <Localized id="configure-webhooks-header-title">
            <Header htmlFor="configure-webhooks-header.title">Webhooks</Header>
          </Localized>
        }
      >
        <Localized id="configure-webhooks-description">
          <FormFieldDescription>
            Configure an endpoint to send events to when events occur within
            Coral. These events will be JSON encoded and signed. To learn more
            about webhook signing, visit{" "}
            <ExternalLink href="https://docs.coralproject.net/coral/v5/integrating/webhooks/">
              our docs
            </ExternalLink>
            .
          </FormFieldDescription>
        </Localized>
        <Button color="dark" onClick={show}>
          <ButtonIcon size="md">add</ButtonIcon>
          <Localized id="configure-webhooks-addEndpoint">
            Add endpoint
          </Localized>
        </Button>
        <ConfigureWebhookEndpointModal
          open={open}
          onHide={hide}
          settings={settings}
          webhookEndpoint={null}
        />
        {settings.webhooks.endpoints.length > 0 && (
          <>
            <Subheader>Endpoints</Subheader>
            <Table fullWidth>
              <TableHead>
                <TableRow>
                  <TableCell>URL</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {settings.webhooks.endpoints.map((endpoint, idx) => (
                  <WebhookEndpointRow key={idx} endpoint={endpoint} />
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </ConfigBox>
    </HorizontalGutter>
  );
};

const enhanced = withFragmentContainer<Props>({
  settings: graphql`
    fragment WebhookEndpointsConfigContainer_settings on Settings {
      webhooks {
        endpoints {
          ...WebhookEndpointRow_webhookEndpoint
        }
      }
      ...ConfigureWebhookEndpointModal_settings
    }
  `,
})(WebhookEndpointsConfigContainer);

export default enhanced;